#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CNPS - Entraînement & Évaluation de modèles (KNN / RandomForest / Gradient Boosting)
-----------------------------------------------------------------------------------
But:
  - Séparer train/test (stratifié), gérer le déséquilibre, encoder proprement,
    tuner et évaluer plusieurs modèles avec des métriques robustes, puis sauvegarder
    métriques, figures et modèles entraînés (production-ready).

Entrées attendues (priorité) :
  1) reports/clean/cnps_imputed_selected.csv    (créé par le script EDA précédent)
  2) reports/clean/cnps_model_input.parquet     (fallback si 1) absent)
  3) reports/clean/cnps_clean.csv               (fallback si 1) et 2) absents)

Cible:
  - RISQUE_BIN ∈ {0,1}

Features utilisées (cohérentes avec l’EDA) :
  NUM:  mois_non_declares, solde, mois_payes_spontane_dern_seg,
        anciennete_mois, recence_decl_mois, recence_seg_mois, ecart_mois_decl_vs_seg
  CAT:  regime, centre_impot, segment, activite

Modèles:
  - KNN (pipeline: OneHot + StandardScaler, SMOTE si imblearn dispo)
  - RandomForest (class_weight='balanced_subsample')
  - Gradient Boosting (LightGBM/XGBoost/CatBoost si installés, sinon sklearn.GradientBoosting)
  - **Stacking (KNN + RF + GBM → méta LogisticRegression)**

Métriques:
  - Accuracy, Precision (pos=1), Recall (pos=1), F1 (pos=1), ROC AUC
  - + Matrice de confusion (png) et courbe ROC (png)

Sorties:
  reports/models/
    - <model_name>_metrics.csv
    - <model_name>_confusion_matrix.png
    - <model_name>_roc_curve.png
    - <model_name>.joblib

Usage:
  python train_models.py --datadir reports/clean --outdir reports/models --test_size 0.2 --random_state 42
"""

from __future__ import annotations
import argparse
import os
import logging
from typing import Dict, List, Tuple, Optional

import numpy as np
import pandas as pd

# sklearn / imblearn
from sklearn.model_selection import train_test_split, StratifiedKFold, RandomizedSearchCV, GridSearchCV
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score,
    RocCurveDisplay, ConfusionMatrixDisplay
)
from sklearn.neighbors import KNeighborsClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, StackingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.utils.class_weight import compute_sample_weight
from sklearn.impute import SimpleImputer
import inspect

# SMOTE optionnel
try:
    from imblearn.over_sampling import SMOTE
    from imblearn.pipeline import Pipeline as ImbPipeline
    HAS_IMBLEARN = True
except Exception:
    HAS_IMBLEARN = False

# Gradient boosting libs optionnelles
HAS_LGBM = False
HAS_XGB = False
HAS_CAT = False
try:
    import lightgbm as lgb
    HAS_LGBM = True
except Exception:
    pass

try:
    from xgboost import XGBClassifier
    HAS_XGB = True
except Exception:
    pass

try:
    from catboost import CatBoostClassifier
    HAS_CAT = True
except Exception:
    pass

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

import joblib
from scipy.stats import randint, uniform, loguniform

# ----------------------------- Logging ---------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)
logger = logging.getLogger("CNPS_TRAIN")

# ----------------------------- Constantes ------------------------------------
TARGET_COL = "RISQUE_BIN"

NUM_CANDIDATES = [
    "mois_non_declares", "solde", "mois_payes_spontane_dern_seg",
    "anciennete_mois", "recence_decl_mois", "recence_seg_mois", "ecart_mois_decl_vs_seg"
]
CAT_CANDIDATES = ["regime", "centre_impot", "segment", "activite"]

TOP_N_CATEGORIES = 30  # anti explosion one-hot
MIN_FREQ_CAT = 15      # seuil minimal (en effectif) pour garder une modalité telle quelle

# ----------------------------- Utils -----------------------------------------
def ensure_dir(p: str) -> None:
    os.makedirs(p, exist_ok=True)

def load_best_available_dataset(datadir: str) -> pd.DataFrame:
    """
    Charge le meilleur dataset disponible (imputed_selected > model_input.parquet > clean.csv).
    """
    candidates = [
        os.path.join(datadir, "cnps_imputed_selected.csv"),
        os.path.join(datadir, "cnps_model_input.parquet"),
        os.path.join(datadir, "cnps_clean.csv"),
    ]
    for path in candidates:
        if os.path.exists(path):
            ext = os.path.splitext(path)[1].lower()
            if ext == ".csv":
                df = pd.read_csv(path)
            elif ext == ".parquet":
                df = pd.read_parquet(path)
            else:
                continue
            logger.info("Dataset chargé: %s (%s, %d lignes, %d colonnes)", os.path.basename(path), ext, df.shape[0], df.shape[1])
            return df
    raise FileNotFoundError("Aucun fichier trouvé dans datadir (attendus: cnps_imputed_selected.csv / cnps_model_input.parquet / cnps_clean.csv).")

def collapse_rare_categories(series: pd.Series, top_n: int = TOP_N_CATEGORIES, min_count: int = MIN_FREQ_CAT) -> pd.Series:
    """
    Garde les TOP_N catégories les plus fréquentes ET toutes catégories ayant au moins `min_count` occurrences.
    Regroupe le reste en 'AUTRE'.
    """
    s = series.fillna("INCONNU").astype(str)
    vc = s.value_counts()
    keep = set(vc.head(top_n).index) | set(vc[vc >= min_count].index)
    return s.where(s.isin(list(keep)), other="AUTRE")

def select_feature_columns(df: pd.DataFrame) -> Tuple[List[str], List[str]]:
    num_cols = [c for c in NUM_CANDIDATES if c in df.columns]
    cat_cols = [c for c in CAT_CANDIDATES if c in df.columns]
    return num_cols, cat_cols

def train_test_split_stratified(df: pd.DataFrame, test_size: float, random_state: int) -> Tuple[pd.DataFrame, pd.DataFrame]:
    if TARGET_COL not in df.columns:
        raise ValueError(f"Colonne cible '{TARGET_COL}' absente.")
    df = df.dropna(subset=[TARGET_COL])
    # Nettoyage de la cible au cas où
    df[TARGET_COL] = df[TARGET_COL].astype(int)
    strat = df[TARGET_COL]
    df_train, df_test = train_test_split(df, test_size=test_size, random_state=random_state, stratify=strat)
    logger.info("Split train/test: train=%d, test=%d (stratifié)", df_train.shape[0], df_test.shape[0])
    return df_train.copy(), df_test.copy()

def _make_onehot() -> OneHotEncoder:
    # compatibilité sklearn <1.2 (sparse) et >=1.2 (sparse_output)
    if "sparse_output" in inspect.signature(OneHotEncoder).parameters:
        return OneHotEncoder(handle_unknown="ignore", sparse_output=True)
    else:
        return OneHotEncoder(handle_unknown="ignore", sparse=True)

def build_preprocessor(num_cols: List[str], cat_cols: List[str], for_knn: bool = False) -> ColumnTransformer:
    numeric_steps = [("num_imputer", SimpleImputer(strategy="constant", fill_value=0.0))]
    if for_knn:
        numeric_steps.append(("num_scaler", StandardScaler(with_mean=True, with_std=True)))
    num_pipe = Pipeline(steps=numeric_steps)

    cat_pipe = Pipeline(steps=[
        ("cat_imputer", SimpleImputer(strategy="constant", fill_value="INCONNU")),
        ("onehot", _make_onehot())  # ← ICI la correction
    ])

    pre = ColumnTransformer(
        transformers=[
            ("num", num_pipe, num_cols),
            ("cat", cat_pipe, cat_cols)
        ],
        remainder="drop",
        sparse_threshold=0.3,
    )
    return pre

def build_X_y(df: pd.DataFrame, num_cols: List[str], cat_cols: List[str]) -> Tuple[pd.DataFrame, pd.Series]:
    X = pd.DataFrame(index=df.index)
    # Numériques -> to_numeric
    for c in num_cols:
        X[c] = pd.to_numeric(df[c], errors="coerce")
    # Catégorielles -> collapse rare
    for c in cat_cols:
        X[c] = collapse_rare_categories(df[c]) if c in df.columns else "INCONNU"
    y = df[TARGET_COL].astype(int)
    return X, y

def compute_pos_weight(y: pd.Series) -> float:
    """scale_pos_weight ≈ (#neg / #pos), bornée pour stabilité."""
    pos = int((y == 1).sum())
    neg = int((y == 0).sum())
    if pos == 0:
        return 1.0
    w = max(1.0, neg / max(1, pos))
    return float(min(w, 50.0))

def evaluate_and_save(model_name: str,
                      estimator,
                      X_test, y_test,
                      outdir: str) -> Dict[str, float]:
    """
    Calcule métriques, trace confusion matrix et ROC, et sauvegarde.
    """
    ensure_dir(outdir)
    y_proba = None
    if hasattr(estimator, "predict_proba"):
        y_proba = estimator.predict_proba(X_test)[:, 1]
    elif hasattr(estimator, "decision_function"):
        scores = estimator.decision_function(X_test)
        # normaliser score en [0,1] (approx sigmoïde) si besoin
        y_proba = 1 / (1 + np.exp(-scores))
    y_pred = estimator.predict(X_test)

    metrics = {
        "accuracy": accuracy_score(y_test, y_pred),
        "precision_pos": precision_score(y_test, y_pred, pos_label=1, zero_division=0),
        "recall_pos": recall_score(y_test, y_pred, pos_label=1, zero_division=0),
        "f1_pos": f1_score(y_test, y_pred, pos_label=1, zero_division=0),
    }
    if y_proba is not None and len(np.unique(y_test)) == 2:
        try:
            metrics["roc_auc"] = roc_auc_score(y_test, y_proba)
        except Exception:
            metrics["roc_auc"] = np.nan
    else:
        metrics["roc_auc"] = np.nan

    # Sauvegarde CSV
    met_path = os.path.join(outdir, f"{model_name}_metrics.csv")
    pd.DataFrame([metrics]).to_csv(met_path, index=False, encoding="utf-8")

    # Matrice de confusion
    fig_cm, ax_cm = plt.subplots(figsize=(4.5, 4))
    ConfusionMatrixDisplay.from_predictions(y_test, y_pred, display_labels=["No Risk (0)", "Risk (1)"], ax=ax_cm)
    ax_cm.set_title(f"Matrice de confusion - {model_name}")
    fig_cm.tight_layout()
    fig_cm.savefig(os.path.join(outdir, f"{model_name}_confusion_matrix.png"))
    plt.close(fig_cm)

    # Courbe ROC
    if y_proba is not None and len(np.unique(y_test)) == 2:
        fig_roc, ax_roc = plt.subplots(figsize=(5, 4))
        RocCurveDisplay.from_predictions(y_test, y_proba, ax=ax_roc, name=model_name)
        ax_roc.set_title(f"ROC - {model_name}")
        fig_roc.tight_layout()
        fig_roc.savefig(os.path.join(outdir, f"{model_name}_roc_curve.png"))
        plt.close(fig_roc)

    logger.info("[%s] Metrics: %s", model_name, metrics)
    return metrics

# ----------------------------- Modèles ---------------------------------------
def fit_knn(X_train, y_train, preprocessor, random_state: int):
    """
    KNN benchmark.
    - Option SMOTE si imblearn dispo (dans une pipeline ImbPipeline).
    - Tuning léger via RandomizedSearchCV (k, leaf_size, p).
    """
    base_knn = KNeighborsClassifier()

    if HAS_IMBLEARN:
        pipe = ImbPipeline(steps=[
            ("pre", preprocessor),
            ("smote", SMOTE(random_state=random_state, k_neighbors=5)),
            ("clf", base_knn)
        ])
    else:
        pipe = Pipeline(steps=[
            ("pre", preprocessor),
            ("clf", base_knn)
        ])

    param_dist = {
        "clf__n_neighbors": randint(3, 31),
        "clf__weights": ["uniform", "distance"],
        "clf__p": [1, 2],  # Manhattan / Euclidien
        "clf__leaf_size": randint(20, 60),
        "clf__algorithm": ["auto", "ball_tree", "kd_tree", "brute"],
    }

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=random_state)
    search = RandomizedSearchCV(
        estimator=pipe,
        param_distributions=param_dist,
        n_iter=25,
        cv=cv,
        scoring="roc_auc",
        verbose=0,
        n_jobs=-1,
        random_state=random_state
    )
    search.fit(X_train, y_train)
    logger.info("[KNN] Best params: %s", search.best_params_)
    return search.best_estimator_

def fit_random_forest(X_train, y_train, preprocessor, random_state: int):
    """
    RandomForest robuste.
    - class_weight='balanced_subsample' pour déséquilibre.
    - RandomizedSearchCV sur profondeur/estimators/feats/leaf.
    - sample_weight fallback (utile si class_weight indisponible).
    """
    rf = RandomForestClassifier(
        n_estimators=300,
        random_state=random_state,
        n_jobs=-1,
        class_weight="balanced_subsample",
    )
    pipe = Pipeline(steps=[("pre", preprocessor), ("clf", rf)])

    param_dist = {
        "clf__n_estimators": randint(200, 600),
        "clf__max_depth": randint(3, 20),
        "clf__min_samples_split": randint(2, 20),
        "clf__min_samples_leaf": randint(1, 20),
        "clf__max_features": ["sqrt", "log2", None],
        "clf__bootstrap": [True, False],
    }

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=random_state)
    search = RandomizedSearchCV(
        estimator=pipe,
        param_distributions=param_dist,
        n_iter=40,
        cv=cv,
        scoring="roc_auc",
        verbose=0,
        n_jobs=-1,
        random_state=random_state
    )
    # sample_weight basé sur class imbalance (en plus)
    sw = compute_sample_weight(class_weight="balanced", y=y_train)
    search.fit(X_train, y_train, clf__sample_weight=sw)
    logger.info("[RF] Best params: %s", search.best_params_)
    return search.best_estimator_

def fit_gb(X_train, y_train, preprocessor, random_state: int):
    """
    Gradient Boosting prioritaire: LightGBM > XGBoost > CatBoost > sklearn GB.
    - Gère le déséquilibre via scale_pos_weight (lgb/xgb/cat) si possible.
    - RandomizedSearchCV pour chaque implémentation.
    """
    pos_w = compute_pos_weight(y_train)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=random_state)

    if HAS_LGBM:
        clf = lgb.LGBMClassifier(
            objective="binary",
            random_state=random_state,
            n_jobs=-1,
            scale_pos_weight=pos_w
        )
        pipe = Pipeline(steps=[("pre", preprocessor), ("clf", clf)])
        param_dist = {
            "clf__n_estimators": randint(300, 1200),
            "clf__num_leaves": randint(15, 255),
            "clf__learning_rate": loguniform(1e-3, 3e-1),
            "clf__min_child_samples": randint(10, 100),
            "clf__subsample": uniform(0.6, 0.4),
            "clf__colsample_bytree": uniform(0.6, 0.4),
            "clf__max_depth": randint(3, 16),
            "clf__reg_alpha": loguniform(1e-4, 1e-1),
            "clf__reg_lambda": loguniform(1e-4, 1e-1),
        }
        search = RandomizedSearchCV(pipe, param_dist, n_iter=50, cv=cv, scoring="roc_auc",
                                    n_jobs=-1, random_state=random_state, verbose=0)
        search.fit(X_train, y_train)
        logger.info("[LGBM] Best params: %s", search.best_params_)
        return search.best_estimator_

    if HAS_XGB:
        clf = XGBClassifier(
            objective="binary:logistic",
            random_state=random_state,
            n_estimators=600,
            tree_method="hist",
            eval_metric="auc",
            n_jobs=-1,
            scale_pos_weight=pos_w
        )
        pipe = Pipeline(steps=[("pre", preprocessor), ("clf", clf)])
        param_dist = {
            "clf__n_estimators": randint(400, 1200),
            "clf__max_depth": randint(3, 14),
            "clf__learning_rate": loguniform(1e-3, 3e-1),
            "clf__subsample": uniform(0.6, 0.4),
            "clf__colsample_bytree": uniform(0.6, 0.4),
            "clf__min_child_weight": loguniform(1e-1, 10),
            "clf__gamma": loguniform(1e-4, 1.0),
            "clf__reg_alpha": loguniform(1e-4, 1e-1),
            "clf__reg_lambda": loguniform(1e-4, 1e-1),
        }
        search = RandomizedSearchCV(pipe, param_dist, n_iter=50, cv=cv, scoring="roc_auc",
                                    n_jobs=-1, random_state=random_state, verbose=0)
        search.fit(X_train, y_train)
        logger.info("[XGB] Best params: %s", search.best_params_)
        return search.best_estimator_

    if HAS_CAT:
        # CatBoost accepte OHE ou natives; ici on reste OHE pour homogénéité pipeline
        clf = CatBoostClassifier(
            loss_function="Logloss",
            random_state=random_state,
            verbose=False,
            scale_pos_weight=pos_w
        )
        pipe = Pipeline(steps=[("pre", preprocessor), ("clf", clf)])
        param_dist = {
            "clf__iterations": randint(400, 1200),
            "clf__depth": randint(3, 10),
            "clf__learning_rate": loguniform(1e-3, 3e-1),
            "clf__l2_leaf_reg": loguniform(1e-2, 1.0),
            "clf__border_count": randint(32, 256),
        }
        search = RandomizedSearchCV(pipe, param_dist, n_iter=40, cv=cv, scoring="roc_auc",
                                    n_jobs=-1, random_state=random_state, verbose=0)
        search.fit(X_train, y_train)
        logger.info("[CAT] Best params: %s", search.best_params_)
        return search.best_estimator_

    # Fallback sklearn
    clf = GradientBoostingClassifier(random_state=random_state)
    pipe = Pipeline(steps=[("pre", preprocessor), ("clf", clf)])
    param_dist = {
        "clf__n_estimators": randint(200, 800),
        "clf__learning_rate": loguniform(1e-3, 3e-1),
        "clf__max_depth": randint(2, 6),
        "clf__min_samples_split": randint(2, 20),
        "clf__min_samples_leaf": randint(1, 20),
        "clf__subsample": uniform(0.6, 0.4),
    }
    search = RandomizedSearchCV(pipe, param_dist, n_iter=40, cv=cv, scoring="roc_auc",
                                n_jobs=-1, random_state=random_state, verbose=0)
    # pondération par échantillon (approx)
    sw = compute_sample_weight(class_weight="balanced", y=y_train)
    search.fit(X_train, y_train, clf__sample_weight=sw)
    logger.info("[GB(sklearn)] Best params: %s", search.best_params_)
    return search.best_estimator_

# ----------------------------- Stacking --------------------------------------
def fit_stacking(X_train, y_train, preprocessor, random_state: int):
    """
    StackingClassifier:
      - Base learners: KNN + RandomForest + GBM (LightGBM > XGB > CatBoost > GB sklearn)
      - Méta-apprenant: LogisticRegression (class_weight='balanced')
      - Tuning rapide du C du méta.
    On place le Stacking à l'intérieur d'une Pipeline avec le même préprocesseur
    'for_knn=True' (scaling + OHE sparse) pour compat KNN.
    """
    # ---- base learners (hyperparams "sensés", robustes) ----
    knn = KNeighborsClassifier(
        n_neighbors=26, weights="distance", p=1, algorithm="brute", leaf_size=59
    )

    rf = RandomForestClassifier(
        n_estimators=450, max_depth=19, max_features="log2",
        min_samples_split=17, min_samples_leaf=1, bootstrap=False,
        class_weight="balanced_subsample", n_jobs=-1, random_state=random_state
    )

    pos_w = compute_pos_weight(y_train)

    if HAS_LGBM:
        gb = lgb.LGBMClassifier(
            objective="binary",
            n_estimators=800, learning_rate=0.05, max_depth=-1,
            subsample=0.8, colsample_bytree=0.8, num_leaves=63,
            min_child_samples=20, reg_alpha=0.05, reg_lambda=0.05,
            scale_pos_weight=pos_w, n_jobs=-1, random_state=random_state
        )
        gb_name = "lgbm"
    elif HAS_XGB:
        gb = XGBClassifier(
            objective="binary:logistic", n_estimators=800, learning_rate=0.05,
            max_depth=8, subsample=0.8, colsample_bytree=0.8, min_child_weight=1.0,
            gamma=0.0, reg_alpha=0.01, reg_lambda=0.05, tree_method="hist",
            eval_metric="auc", n_jobs=-1, random_state=random_state,
            scale_pos_weight=pos_w
        )
        gb_name = "xgb"
    elif HAS_CAT:
        gb = CatBoostClassifier(
            loss_function="Logloss", iterations=800, learning_rate=0.05, depth=7,
            l2_leaf_reg=3.0, random_state=random_state, verbose=False,
            scale_pos_weight=pos_w
        )
        gb_name = "cat"
    else:
        gb = GradientBoostingClassifier(
            n_estimators=400, learning_rate=0.05, max_depth=3, random_state=random_state
        )
        gb_name = "gb_sklearn"

    estimators = [("knn", knn), ("rf", rf), (gb_name, gb)]

    meta = LogisticRegression(
        penalty="l2", C=1.0, max_iter=1000, class_weight="balanced", solver="lbfgs"
    )

    stack = StackingClassifier(
        estimators=estimators,
        final_estimator=meta,
        stack_method="predict_proba",
        passthrough=False,
        n_jobs=-1
    )

    pipe = Pipeline([("pre", preprocessor), ("clf", stack)])

    # Tuning léger du méta (C)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=random_state)
    grid = GridSearchCV(
        pipe,
        param_grid={"clf__final_estimator__C": [0.5, 1.0, 2.0]},
        scoring="f1",
        cv=cv,
        n_jobs=-1,
        refit=True,
        verbose=0
    )
    grid.fit(X_train, y_train)
    logger.info("[STACKING] Best params: %s", grid.best_params_)
    return grid.best_estimator_

# --------------------------------- Main --------------------------------------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--datadir", default="reports/clean", help="Dossier des données nettoyées")
    parser.add_argument("--outdir", default="reports/models", help="Dossier de sortie (modèles/rapports)")
    parser.add_argument("--test_size", type=float, default=0.2, help="Taille du test set")
    parser.add_argument("--random_state", type=int, default=42, help="Seed")
    args = parser.parse_args()

    ensure_dir(args.outdir)

    # 1) Chargement
    df = load_best_available_dataset(args.datadir)

    # 2) Vérif & sélection des features
    if TARGET_COL not in df.columns:
        raise ValueError(f"Cible '{TARGET_COL}' manquante. Assurez-vous d'avoir exécuté le script EDA/clean.")
    num_cols, cat_cols = select_feature_columns(df)
    if not num_cols and not cat_cols:
        raise ValueError("Aucune feature pertinente trouvée. Vérifiez les noms de colonnes.")
    logger.info("Features numériques: %s", num_cols)
    logger.info("Features catégorielles: %s", cat_cols)

    # 3) Split stratifié
    df_train, df_test = train_test_split_stratified(df, test_size=args.test_size, random_state=args.random_state)
    X_train, y_train = build_X_y(df_train, num_cols, cat_cols)
    X_test, y_test   = build_X_y(df_test,  num_cols, cat_cols)

    # 4) Préprocesseurs
    pre_knn = build_preprocessor(num_cols, cat_cols, for_knn=True)
    pre_tree = build_preprocessor(num_cols, cat_cols, for_knn=False)

    # 5) Entraînement + Évaluation
    results = []

    # --- KNN ---
    try:
        knn_est = fit_knn(X_train, y_train, preprocessor=pre_knn, random_state=args.random_state)
        knn_metrics = evaluate_and_save("knn", knn_est, X_test, y_test, args.outdir)
        joblib.dump(knn_est, os.path.join(args.outdir, "knn.joblib"))
        results.append({"model": "knn", **knn_metrics})
    except Exception as e:
        logger.exception("Erreur KNN: %s", e)

    # --- RandomForest ---
    try:
        rf_est = fit_random_forest(X_train, y_train, preprocessor=pre_tree, random_state=args.random_state)
        rf_metrics = evaluate_and_save("random_forest", rf_est, X_test, y_test, args.outdir)
        joblib.dump(rf_est, os.path.join(args.outdir, "random_forest.joblib"))
        results.append({"model": "random_forest", **rf_metrics})
    except Exception as e:
        logger.exception("Erreur RandomForest: %s", e)

    # --- Gradient Boosting (LGBM/XGB/CAT/sklearn) ---
    try:
        gb_est = fit_gb(X_train, y_train, preprocessor=pre_tree, random_state=args.random_state)
        gb_name = "lightgbm" if HAS_LGBM else ("xgboost" if HAS_XGB else ("catboost" if HAS_CAT else "gb_sklearn"))
        gb_metrics = evaluate_and_save(gb_name, gb_est, X_test, y_test, args.outdir)
        joblib.dump(gb_est, os.path.join(args.outdir, f"{gb_name}.joblib"))
        results.append({"model": gb_name, **gb_metrics})
    except Exception as e:
        logger.exception("Erreur Gradient Boosting: %s", e)

    # --- Stacking (KNN + RF + GBM) ---
    try:
        stacking_est = fit_stacking(X_train, y_train, preprocessor=pre_knn, random_state=args.random_state)
        stacking_metrics = evaluate_and_save("stacking", stacking_est, X_test, y_test, args.outdir)
        joblib.dump(stacking_est, os.path.join(args.outdir, "stacking.joblib"))
        results.append({"model": "stacking", **stacking_metrics})
    except Exception as e:
        logger.exception("Erreur Stacking: %s", e)

    # 6) Récapitulatif
    if results:
        df_res = pd.DataFrame(results)
        df_res = df_res.sort_values(by=["roc_auc", "f1_pos", "recall_pos"], ascending=False, na_position="last")
        df_res.to_csv(os.path.join(args.outdir, "summary_metrics.csv"), index=False, encoding="utf-8")
        logger.info("Résumé des performances:\n%s", df_res.to_string(index=False))
    else:
        logger.warning("Aucun résultat exploitable n'a été produit.")

if __name__ == "__main__":
    main()
