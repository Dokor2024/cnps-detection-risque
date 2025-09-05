#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CNPS - Nettoyage ciblé & EDA (Univariée / Bivariée centrée métier)
-------------------------------------------------------------------
Objectif : Produire une EDA utile au modèle de prédiction de RISQUE, en se
limitant strictement aux variables pertinentes, tout en sortant des figures
spécifiques pour éviter le débordement visuel.

- Variables UNIVARIÉES étudiées :
  * Quantitatives   : mois_non_declares, solde, mois_payes_spontane_dern_seg
  * Qualitatives    : regime, risque, segment, activite, centre_impot
  * Temporelles     : date_effet, dernier_mois_declare, periode_dernier_segment
                      (analysées via features numériques dérivées :
                       anciennete_mois, recence_decl_mois, recence_seg_mois)

- Variables BIVARIÉES (vs RISQUE_BIN) :
  * Quantitatives   : mois_non_declares, solde, mois_payes_spontane_dern_seg
  * Qualitatives    : regime, centre_impot, segment, activite
  * Temporelles     : anciennete_mois, recence_decl_mois, recence_seg_mois

Sorties :
- Dataset nettoyé : reports/clean/cnps_clean.parquet|csv
- Tableaux EDA    : reports/eda/*.csv
- Figures         : reports/figures/*
    * categorical_univariate_2x2.png  (catégories hors 'activite')
    * univariate_activite.png         (figure dédiée)
    * bivariate_categorical_stacked_2x2.png (catégories hors 'activite')
    * bivariate_activite_vs_risque.png      (figure dédiée)
    * numeric_univariate_3cols.png, temporal_univariate_3cols.png
      bivariate_numeric_box_3cols.png, bivariate_temporal_box_3cols.png

Usage:
  python cnps_clean_eda.py --input data_cnps.xlsx --sheet Feuil1 --outdir reports/ --date_ref 2025-04-30
"""

from __future__ import annotations
import argparse
import os
import re
import logging
from typing import Optional, List, Tuple, Dict

import numpy as np
import pandas as pd

# Backend non-GUI pour environnements headless
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from scipy import stats

# ----------------------------- Logging ---------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)
logger = logging.getLogger("CNPS_EDA")

# ------------------------- Config & constantes -------------------------------
FR_MONTHS = {
    "jan": 1, "janv": 1,
    "fev": 2, "fevr": 2, "fév": 2, "févr": 2,
    "mar": 3, "mars": 3,
    "avr": 4, "avr.": 4,
    "mai": 5,
    "juin": 6,
    "juil": 7, "juillet": 7,
    "aou": 8, "août": 8, "aout": 8,
    "sep": 9, "sept": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12, "déc": 12,
}

RENAME_MAP = {
    "N°": "row_id",
    "N° EMPLOYEUR": "no_employeur",
    "RAISON SOCIALE": "raison_sociale",
    "Date d'effet": "date_effet",
    "N° COTRIBUABLE": "no_contribuable",
    "N° Registre de comm / Ref. Doc de cration": "registre_commerce",
    "REGIME": "regime",
    "RISQUE": "risque",
    "DERNIER MOIS DECLARE": "dernier_mois_declare",
    "ADRESSE": "adresse",
    "BP": "bp",
    "TELEPHONE": "telephone",
    "Centre Impôt": "centre_impot",
    "Email": "email",
    "Quartier": "quartier",
    "Lieu dit": "lieu_dit",
    "Solde": "solde",
    "mois non declares": "mois_non_declares",
    "Segment": "segment",
    "Periode dernier segment": "periode_dernier_segment",
    "Mois payés en spontané derière segmentation": "mois_payes_spontane_dern_seg",
    "Activité": "activite",
}

# PII/identifiants à exclure du jeu "modèle"
DROP_COLS_FOR_MODEL = [
    "row_id", "no_employeur", "raison_sociale",
    "adresse", "bp", "telephone", "email",
    "quartier", "lieu_dit"
]

# Variables pertinentes métier pour l'EDA
NUM_COLS_UNI = ["mois_non_declares", "solde", "mois_payes_spontane_dern_seg"]
CAT_COLS_UNI = ["regime", "risque", "segment", "activite", "centre_impot"]
# Temporel -> via features numériques dérivées
TEMP_BASE_COLS = ["date_effet", "dernier_mois_declare", "periode_dernier_segment"]
TEMP_DERIVED = ["anciennete_mois", "recence_decl_mois", "recence_seg_mois"]

# Bivariée vs cible
NUM_COLS_BI = ["mois_non_declares", "solde", "mois_payes_spontane_dern_seg"]
CAT_COLS_BI = ["regime", "centre_impot", "segment", "activite"]
TEMP_COLS_BI = ["anciennete_mois", "recence_decl_mois", "recence_seg_mois"]

TOP_N_CATEGORIES = 20  # Limiter cardinalité pour graphes/tables

# --------------------------- Helpers date FR ---------------------------------
def _clean_str(x: Optional[str]) -> Optional[str]:
    if pd.isna(x):
        return None
    s = str(x).strip()
    return s if s else None

def parse_fr_period_to_datetime(s: Optional[str]) -> Optional[pd.Timestamp]:
    """
    Parse "avr.-25", "mars-25", "janv.-2024", etc. -> dernier jour du mois.
    Règle année à 2 chiffres : <=50 -> 2000+, sinon 1900+.
    """
    s = _clean_str(s)
    if not s:
        return None

    s_norm = (
        s.lower()
         .replace("é", "e").replace("è", "e").replace("ê", "e")
         .replace("û", "u").replace("ù", "u")
         .replace("ô", "o").replace("ï", "i").replace("î", "i")
         .replace("à", "a").replace("â", "a").replace("ç", "c")
         .replace("déc", "dec").replace("févr", "fevr").replace("fév", "fev")
         .replace("août", "aout")
    ).replace(" ", "")

    m = re.search(r"([a-z\.]+)-(\d{2,4})$", s_norm) or re.search(r"([a-z\.]+)(\d{2,4})$", s_norm)
    if not m:
        return None

    m_str, y_str = m.group(1).rstrip("."), m.group(2)
    month = FR_MONTHS.get(m_str) or FR_MONTHS.get(m_str[:3])
    if not month:
        return None

    year = int(y_str)
    if len(y_str) == 2:
        year = 2000 + year if year <= 50 else 1900 + year

    dt = pd.Timestamp(year=year, month=month, day=1)
    dt_last = (dt + pd.offsets.MonthBegin(1)) - pd.Timedelta(days=1)
    return dt_last

def months_between(a: Optional[pd.Timestamp], b: Optional[pd.Timestamp]) -> Optional[int]:
    if pd.isna(a) or pd.isna(b) or a is None or b is None:
        return None
    return (a.year * 12 + a.month) - (b.year * 12 + b.month)

# ------------------------------ Pipeline -------------------------------------
def load_data(path: str, sheet: Optional[int|str] = 0) -> pd.DataFrame:
    # robustifier : "0" -> 0
    if isinstance(sheet, str) and sheet.isdigit():
        sheet = int(sheet)
    ext = os.path.splitext(path)[1].lower()
    if ext in (".xlsx", ".xls"):
        df = pd.read_excel(path, sheet_name=sheet)
    elif ext == ".csv":
        df = pd.read_csv(path)
    else:
        raise ValueError("Format non supporté. Utilise .xlsx/.xls ou .csv")
    logger.info("Données chargées: %s lignes, %s colonnes", *df.shape)
    return df

def standardize_columns(df: pd.DataFrame) -> pd.DataFrame:
    cols = {c: c.strip() for c in df.columns}
    df = df.rename(columns=cols).rename(columns=RENAME_MAP)
    return df

def clean_and_engineer(df: pd.DataFrame, date_ref: Optional[str]) -> pd.DataFrame:
    ref_dt = pd.Timestamp(date_ref) if date_ref else pd.Timestamp.today().normalize()

    # Types de base
    if "date_effet" in df.columns:
        df["date_effet"] = pd.to_datetime(df["date_effet"], errors="coerce", dayfirst=True)

    # IDs présents ?
    df["has_tax_id"] = df.get("no_contribuable").notna() & (df.get("no_contribuable").astype(str).str.len() > 0)
    df["has_trade_registry"] = df.get("registre_commerce").notna() & (df.get("registre_commerce").astype(str).str.len() > 0)

    # Parsing périodes FR
    df["dernier_mois_decl_dt"] = df.get("dernier_mois_declare").apply(parse_fr_period_to_datetime)
    df["periode_dern_seg_dt"] = df.get("periode_dernier_segment").apply(parse_fr_period_to_datetime)

    # Dérivées temporelles (centrales pour l'analyse)
    df["anciennete_mois"] = df["date_effet"].apply(lambda d: months_between(ref_dt, d) if pd.notna(d) else np.nan)
    df["recence_decl_mois"] = df["dernier_mois_decl_dt"].apply(lambda d: months_between(ref_dt, d) if pd.notna(d) else np.nan)
    df["recence_seg_mois"] = df["periode_dern_seg_dt"].apply(lambda d: months_between(ref_dt, d) if pd.notna(d) else np.nan)
    df["ecart_mois_decl_vs_seg"] = df.apply(
        lambda r: months_between(r["dernier_mois_decl_dt"], r["periode_dern_seg_dt"])
        if pd.notna(r.get("dernier_mois_decl_dt")) and pd.notna(r.get("periode_dern_seg_dt")) else np.nan, axis=1
    )

    # Numériques clés
    for col in ["solde", "mois_non_declares", "mois_payes_spontane_dern_seg"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Catégorielles retenues
    for col in ["regime", "risque", "segment", "centre_impot", "activite"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip().str.replace(r"\s+", " ", regex=True)

    # Cible binaire
    if "risque" in df.columns:
        df["RISQUE_BIN"] = df["risque"].map(lambda x: 0 if str(x).upper() == "A" else 1 if str(x).upper() in {"B", "C"} else np.nan).astype("float")

    return df

# ------------------------------ EDA Utils ------------------------------------
def _ensure_dir(p: str) -> None:
    os.makedirs(p, exist_ok=True)

def _topn_with_other(s: pd.Series, n: int = TOP_N_CATEGORIES) -> pd.Series:
    vc = s.fillna("NA").value_counts()
    if len(vc) <= n:
        return s.fillna("NA")
    top = set(vc.head(n).index)
    return s.fillna("NA").apply(lambda x: x if x in top else "Autres")

def _shapiro_ok(arr: np.ndarray, max_n: int = 5000) -> bool:
    """Normalité approx : Shapiro (échantillonné si > max_n)."""
    if len(arr) < 3:
        return False
    sample = arr if len(arr) <= max_n else np.random.default_rng(42).choice(arr, size=max_n, replace=False)
    stat, p = stats.shapiro(sample)
    return bool(p > 0.05)

def _levene_ok(x0: np.ndarray, x1: np.ndarray) -> bool:
    stat, p = stats.levene(x0, x1, center="median")
    return bool(p > 0.05)

# --------------------------- UNIVARIÉE Ciblée --------------------------------
def univariate_analysis_targeted(df: pd.DataFrame, outroot: str) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Produit :
      - univariate_numeric.csv (stats)
      - univariate_categorical.csv (n, top)
      - univariate_temporal.csv (stats sur features temporelles dérivées)
      - Figures composites :
          * numeric_univariate_3cols.png (3 hist)
          * categorical_univariate_2x2.png (barplots hors 'activite')
          * univariate_activite.png (barh dédié, top-N+Autres)
          * temporal_univariate_3cols.png (hist sur features temporelles)
    """
    figdir = os.path.join(outroot, "figures")
    _ensure_dir(figdir)

    num_cols = [c for c in NUM_COLS_UNI if c in df.columns]
    cat_cols = [c for c in CAT_COLS_UNI if c in df.columns]
    temp_cols = [c for c in TEMP_DERIVED if c in df.columns]

    # --- Numériques : stats + figure 1xN
    num_rows = []
    for col in num_cols:
        s = df[col].dropna()
        if s.empty: 
            continue
        desc = s.describe()
        num_rows.append({
            "col": col, "count": desc.get("count"), "mean": desc.get("mean"),
            "std": desc.get("std"), "min": desc.get("min"),
            "25%": desc.get("25%"), "50%": desc.get("50%"), "75%": desc.get("75%"),
            "max": desc.get("max"), "missing": df[col].isna().sum()
        })

    if num_cols:
        fig, axes = plt.subplots(1, len(num_cols), figsize=(5*len(num_cols), 4))
        if len(num_cols) == 1:
            axes = [axes]
        for ax, col in zip(axes, num_cols):
            ax.hist(df[col].dropna(), bins=30)
            ax.set_title(f"Histogramme - {col}")
            ax.set_xlabel(col); ax.set_ylabel("Fréquence")
        fig.tight_layout()
        fig.savefig(os.path.join(figdir, "numeric_univariate_3cols.png"))
        plt.close(fig)

    # --- Catégorielles : counts + figure 2x2 (EXCLUT 'activite' du composite) + figure dédiée 'activite'
    cat_rows = []
    plots = []
    activite_series = None  # série topN+Autres pour figure dédiée

    for col in cat_cols:
        vc = df[col].value_counts(dropna=False)
        cat_rows.append({
            "col": col, "unique": int(df[col].nunique(dropna=True)),
            "top": None if vc.empty else str(vc.index[0]),
            "top_freq": 0 if vc.empty else int(vc.iloc[0]),
            "missing": int(df[col].isna().sum())
        })
        s_plot = _topn_with_other(df[col], n=TOP_N_CATEGORIES).value_counts().sort_values(ascending=False)
        if col == "activite":
            activite_series = s_plot
        else:
            plots.append((col, s_plot))

    # Composite 2x2 pour autres catégorielles
    if plots:
        n_plots = min(len(plots), 4)
        rows, cols = 2, 2
        fig, axes = plt.subplots(rows, cols, figsize=(12, 8))
        axes = axes.ravel()
        for i in range(n_plots):
            col, s_plot = plots[i]
            axes[i].bar(s_plot.index.astype(str), s_plot.values)
            axes[i].set_title(col); axes[i].tick_params(axis='x', labelrotation=90)
        for j in range(n_plots, rows*cols):
            fig.delaxes(axes[j])
        fig.tight_layout()
        fig.savefig(os.path.join(figdir, "categorical_univariate_2x2.png"))
        plt.close(fig)

    # Figure dédiée 'activite' (barres horizontales pour éviter le débordement)
    if activite_series is not None and len(activite_series) > 0:
        h = max(6, 0.4 * len(activite_series))
        fig, ax = plt.subplots(figsize=(14, h))
        ax.barh(activite_series.index.astype(str), activite_series.values)
        ax.set_title("Activité - Top catégories")
        ax.set_xlabel("Nombre")
        ax.invert_yaxis()
        fig.tight_layout()
        fig.savefig(os.path.join(figdir, "univariate_activite.png"))
        plt.close(fig)

    # --- Temporelles (via features dérivées) : stats + figure 1xN
    temp_rows = []
    for col in temp_cols:
        s = df[col].dropna()
        if s.empty:
            continue
        desc = s.describe()
        temp_rows.append({
            "col": col, "count": desc.get("count"), "mean": desc.get("mean"),
            "std": desc.get("std"), "min": desc.get("min"),
            "25%": desc.get("25%"), "50%": desc.get("50%"), "75%": desc.get("75%"),
            "max": desc.get("max"), "missing": df[col].isna().sum()
        })

    if temp_cols:
        fig, axes = plt.subplots(1, len(temp_cols), figsize=(5*len(temp_cols), 4))
        if len(temp_cols) == 1:
            axes = [axes]
        for ax, col in zip(axes, temp_cols):
            ax.hist(df[col].dropna(), bins=30)
            ax.set_title(f"Histogramme - {col}")
            ax.set_xlabel(col); ax.set_ylabel("Fréquence")
        fig.tight_layout()
        fig.savefig(os.path.join(figdir, "temporal_univariate_3cols.png"))
        plt.close(fig)

    # Sauvegardes CSV
    uni_num = pd.DataFrame(num_rows)
    uni_cat = pd.DataFrame(cat_rows)
    uni_tmp = pd.DataFrame(temp_rows)
    edadir = os.path.join(outroot, "eda")
    _ensure_dir(edadir)
    if not uni_num.empty: uni_num.to_csv(os.path.join(edadir, "univariate_numeric.csv"), index=False)
    if not uni_cat.empty: uni_cat.to_csv(os.path.join(edadir, "univariate_categorical.csv"), index=False)
    if not uni_tmp.empty: uni_tmp.to_csv(os.path.join(edadir, "univariate_temporal.csv"), index=False)

    return uni_num, uni_cat, uni_tmp

# --------------------------- BIVARIÉE vs RISQUE ------------------------------
def bivariate_vs_risk(df: pd.DataFrame, outroot: str, target_bin: str = "RISQUE_BIN") -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Tests + Graphiques :
      - Numériques : Mann-Whitney par défaut; t-test si normalité + homoscédasticité.
        Graphiques : boxplots composites (1xN).
        + Corrélation point-bisériale alignée (y/x masqués).
      - Catégorielles : Chi² sur crosstab (top-N + Autres).
        Graphiques : barplots empilés (2x2) HORS 'activite' + figure dédiée 'activite vs risque' en horizontal.
      - Temporelles : boxplots (1xN) sur features dérivées.
    Sorties CSV :
      - bivariate_numeric_tests.csv
      - bivariate_categorical_chi2.csv
      - bivariate_temporal_tests.csv
    """
    edadir = os.path.join(outroot, "eda")
    figdir = os.path.join(outroot, "figures")
    _ensure_dir(edadir); _ensure_dir(figdir)

    if target_bin not in df.columns:
        logger.warning("Cible binaire %s non trouvée. Bivariée non exécutée.", target_bin)
        return pd.DataFrame(), pd.DataFrame(), pd.DataFrame()

    # Nettoyage cible
    work = df[[target_bin] + list(set(NUM_COLS_BI + CAT_COLS_BI + TEMP_COLS_BI))].copy()
    work = work.dropna(subset=[target_bin])
    y = work[target_bin].astype(int)

    # -------- Numériques vs cible
    num_tests = []
    num_cols = [c for c in NUM_COLS_BI if c in work.columns]
    if num_cols:
        fig, axes = plt.subplots(1, len(num_cols), figsize=(5*len(num_cols), 4))
        if len(num_cols) == 1:
            axes = [axes]
        for ax, col in zip(axes, num_cols):
            x0 = work.loc[y == 0, col].dropna().values
            x1 = work.loc[y == 1, col].dropna().values
            if len(x0) > 5 and len(x1) > 5:
                # Choix du test
                if _shapiro_ok(x0) and _shapiro_ok(x1) and _levene_ok(x0, x1):
                    stat, p = stats.ttest_ind(x0, x1, equal_var=True)
                    test_name = "t-test_ind"
                else:
                    stat, p = stats.mannwhitneyu(x0, x1, alternative="two-sided")
                    test_name = "mannwhitneyu"

                # Corrélation point-bisériale (alignée)
                try:
                    mask = work[col].notna()
                    r_pb, p_pb = stats.pointbiserialr(y[mask], work.loc[mask, col])
                except Exception:
                    r_pb, p_pb = np.nan, np.nan

                num_tests.append({
                    "feature": col, "test": test_name, "stat": float(stat), "pvalue": float(p),
                    "mean_0": float(np.mean(x0)), "mean_1": float(np.mean(x1)),
                    "r_pointbiserial": float(r_pb) if pd.notna(r_pb) else np.nan,
                    "p_pointbiserial": float(p_pb) if pd.notna(p_pb) else np.nan,
                    "n0": int(len(x0)), "n1": int(len(x1))
                })

                # Boxplot
                ax.boxplot([x0, x1], tick_labels=["RISQUE=0(A)", "RISQUE=1(B/C)"])
                ax.set_title(f"{col} vs {target_bin}")
                ax.set_ylabel(col)
            else:
                ax.set_visible(False)
        fig.tight_layout()
        fig.savefig(os.path.join(figdir, "bivariate_numeric_box_3cols.png"))
        plt.close(fig)

    num_df = pd.DataFrame(num_tests)
    if not num_df.empty:
        num_df.sort_values("pvalue", na_position="first").to_csv(
            os.path.join(edadir, "bivariate_numeric_tests.csv"), index=False
        )

    # -------- Catégorielles vs cible (Chi²)
    cat_tests = []
    cat_cols = [c for c in CAT_COLS_BI if c in work.columns]
    plots = []
    activite_pct = None  # table % pour figure dédiée

    for col in cat_cols:
        s = _topn_with_other(work[col], n=TOP_N_CATEGORIES)
        ct = pd.crosstab(s, y)
        if ct.shape[0] >= 2:
            # garantir colonnes 0/1
            for cls in (0, 1):
                if cls not in ct.columns:
                    ct[cls] = 0
            ct = ct[[0, 1]]
            try:
                chi2, p, dof, _ = stats.chi2_contingency(ct)
            except Exception:
                chi2, p, dof = np.nan, np.nan, np.nan
            cat_tests.append({"feature": col, "chi2": float(chi2) if pd.notna(chi2) else np.nan,
                              "dof": int(dof) if pd.notna(dof) else np.nan,
                              "pvalue": float(p) if pd.notna(p) else np.nan,
                              "levels": int(ct.shape[0])})
            pct = ct.div(ct.sum(axis=1), axis=0)
            if col == "activite":
                activite_pct = pct
            else:
                plots.append((col, pct))

    # Figure 2x2 barplots empilés (HORS 'activite')
    if plots:
        n_plots = min(len(plots), 4)
        rows, cols = 2, 2
        fig, axes = plt.subplots(rows, cols, figsize=(12, 8))
        axes = axes.ravel()
        for i in range(n_plots):
            col, pct = plots[i]
            pct = pct.sort_values(by=1, ascending=False)
            bottom = np.zeros(len(pct))
            for cls in pct.columns:
                axes[i].bar(pct.index.astype(str), pct[cls].values, bottom=bottom)
                bottom += pct[cls].values
            axes[i].set_title(f"{col} vs {target_bin}")
            axes[i].tick_params(axis='x', labelrotation=90)
            axes[i].set_ylabel("Proportion")
        for j in range(n_plots, rows*cols):
            fig.delaxes(axes[j])
        fig.tight_layout()
        fig.savefig(os.path.join(figdir, "bivariate_categorical_stacked_2x2.png"))
        plt.close(fig)

    # Figure dédiée 'activite vs risque' (barres horizontales empilées)
    if activite_pct is not None and len(activite_pct) > 0:
        pct = activite_pct.copy()
        pct = pct.sort_values(by=1, ascending=False).head(TOP_N_CATEGORIES)
        h = max(6, 0.4 * len(pct))
        fig, ax = plt.subplots(figsize=(14, h))
        y_pos = np.arange(len(pct))
        ax.barh(y_pos, pct[0].values, label="RISQUE=0(A)")
        ax.barh(y_pos, pct[1].values, left=pct[0].values, label="RISQUE=1(B/C)")
        ax.set_yticks(y_pos)
        ax.set_yticklabels(pct.index.astype(str))
        ax.invert_yaxis()
        ax.set_xlabel("Proportion")
        ax.set_title("Activité vs RISQUE (Top catégories)")
        ax.legend(loc="lower right")
        fig.tight_layout()
        fig.savefig(os.path.join(figdir, "bivariate_activite_vs_risque.png"))
        plt.close(fig)

    cat_df = pd.DataFrame(cat_tests)
    if not cat_df.empty:
        cat_df.sort_values("pvalue", na_position="first").to_csv(
            os.path.join(edadir, "bivariate_categorical_chi2.csv"), index=False
        )

    # -------- Temporelles vs cible (features dérivées)
    temp_tests = []
    tcols = [c for c in TEMP_COLS_BI if c in work.columns]
    if tcols:
        fig, axes = plt.subplots(1, len(tcols), figsize=(5*len(tcols), 4))
        if len(tcols) == 1:
            axes = [axes]
        for ax, col in zip(axes, tcols):
            x0 = work.loc[y == 0, col].dropna().values
            x1 = work.loc[y == 1, col].dropna().values
            if len(x0) > 5 and len(x1) > 5:
                if _shapiro_ok(x0) and _shapiro_ok(x1) and _levene_ok(x0, x1):
                    stat, p = stats.ttest_ind(x0, x1, equal_var=True)
                    test_name = "t-test_ind"
                else:
                    stat, p = stats.mannwhitneyu(x0, x1, alternative="two-sided")
                    test_name = "mannwhitneyu"
                temp_tests.append({
                    "feature": col, "test": test_name, "stat": float(stat), "pvalue": float(p),
                    "mean_0": float(np.mean(x0)), "mean_1": float(np.mean(x1)),
                    "n0": int(len(x0)), "n1": int(len(x1))
                })
                ax.boxplot([x0, x1], tick_labels=["RISQUE=0(A)", "RISQUE=1(B/C)"])
                ax.set_title(f"{col} vs {target_bin}")
                ax.set_ylabel(col)
            else:
                ax.set_visible(False)
        fig.tight_layout()
        fig.savefig(os.path.join(figdir, "bivariate_temporal_box_3cols.png"))
        plt.close(fig)

    temp_df = pd.DataFrame(temp_tests)
    if not temp_df.empty:
        temp_df.sort_values("pvalue", na_position="first").to_csv(
            os.path.join(edadir, "bivariate_temporal_tests.csv"), index=False
        )

    return num_df, cat_df, temp_df

# ----------------------- CORRÉLATIONS (propres, sans NaN parasites) ----------------------
def correlation_analysis(df: pd.DataFrame, outroot: str, target_bin: str = "RISQUE_BIN") -> None:
    """
    Sorties:
      - reports/eda/corr_numeric_spearman.csv
      - reports/figures/heatmap_corr_numeric.png
      - reports/eda/corr_pointbiserial_vs_risque.csv
      - reports/figures/barh_pointbiserial_vs_risque.png

    Règles:
      - Variables numériques pertinentes uniquement:
        mois_non_declares, solde, mois_payes_spontane_dern_seg,
        anciennete_mois, recence_decl_mois, recence_seg_mois, ecart_mois_decl_vs_seg (si dispo)
      - On retire les colonnes:
          * avec < min_valid valeurs non-nulles
          * ou variance nulle (constantes)
      - Corr Spearman (robuste), min_periods=10 pour éviter les corréls sur n trop faible.
      - La heatmap ne contient ni lignes ni colonnes entièrement NaN.
      - Corrélation point-bisériale vs cible: on masque x/y sur les mêmes indices non-nuls.
    """
    edadir = os.path.join(outroot, "eda")
    figdir = os.path.join(outroot, "figures")
    os.makedirs(edadir, exist_ok=True); os.makedirs(figdir, exist_ok=True)

    candidate_cols = [
        "mois_non_declares", "solde", "mois_payes_spontane_dern_seg",
        "anciennete_mois", "recence_decl_mois", "recence_seg_mois", "ecart_mois_decl_vs_seg"
    ]
    min_valid = 10

    # --- Filtrage des colonnes numériques utiles et "saines"
    num_cols = []
    for c in candidate_cols:
        if c in df.columns:
            s = pd.to_numeric(df[c], errors="coerce")
            if s.notna().sum() >= min_valid and s.nunique(dropna=True) >= 2:
                num_cols.append(c)

    # === Matrice Spearman ===
    if num_cols:
        df_num = df[num_cols].apply(pd.to_numeric, errors="coerce")
        corr = df_num.corr(method="spearman", min_periods=min_valid)

        # Purge lignes/colonnes 100% NaN pour une heatmap compacte
        keep_rows = corr.index[~corr.isna().all(axis=1)]
        corr = corr.loc[keep_rows]
        keep_cols = corr.columns[~corr.isna().all(axis=0)]
        corr = corr.loc[:, keep_cols]

        # Sauvegarde CSV
        corr.to_csv(os.path.join(edadir, "corr_numeric_spearman.csv"), encoding="utf-8", index=True)

        # Heatmap lisible (sans seaborn)
        if corr.shape[0] > 0 and corr.shape[1] > 0:
            n = corr.shape[0]
            fig_w = max(6, 0.9 * n + 3)
            fig_h = max(5, 0.9 * n + 2)
            fig, ax = plt.subplots(figsize=(fig_w, fig_h))
            im = ax.imshow(corr.values, vmin=-1, vmax=1, aspect="auto")
            ax.set_xticks(range(corr.shape[1])); ax.set_yticks(range(corr.shape[0]))
            ax.set_xticklabels(corr.columns, rotation=45, ha="right")
            ax.set_yticklabels(corr.index)
            cbar = plt.colorbar(im, ax=ax)
            cbar.ax.set_ylabel("Spearman ρ", rotation=90, va="center")
            # Valeurs centrées
            for i in range(corr.shape[0]):
                for j in range(corr.shape[1]):
                    val = corr.values[i, j]
                    if not np.isnan(val):
                        ax.text(j, i, f"{val:.2f}", ha="center", va="center", fontsize=8)
            ax.set_title("Matrice de corrélation (Spearman) - Variables pertinentes")
            fig.tight_layout()
            fig.savefig(os.path.join(figdir, "heatmap_corr_numeric.png"))
            plt.close(fig)

    # === Corrélation point-bisériale vs RISQUE_BIN ===
    if target_bin in df.columns and num_cols:
        rows = []
        y_all = df[target_bin]
        for col in num_cols:
            x = pd.to_numeric(df[col], errors="coerce")
            mask = x.notna() & y_all.notna()
            if mask.sum() >= min_valid:
                try:
                    r_pb, p_pb = stats.pointbiserialr(y_all[mask].astype(int), x[mask].astype(float))
                except Exception:
                    r_pb, p_pb = np.nan, np.nan
            else:
                r_pb, p_pb = np.nan, np.nan
            rows.append({"feature": col,
                         "r_pointbiserial": float(r_pb) if pd.notna(r_pb) else np.nan,
                         "pvalue": float(p_pb) if pd.notna(p_pb) else np.nan,
                         "n": int(mask.sum())})
        corr_pb = pd.DataFrame(rows).dropna(subset=["r_pointbiserial"], how="all")
        if not corr_pb.empty:
            corr_pb = corr_pb.sort_values(by="r_pointbiserial")
            corr_pb.to_csv(os.path.join(edadir, "corr_pointbiserial_vs_risque.csv"), index=False, encoding="utf-8")

            # Barres horizontales (sans débordement)
            h = max(4, 0.5 * len(corr_pb))
            fig, ax = plt.subplots(figsize=(10, h))
            ax.barh(corr_pb["feature"].astype(str), corr_pb["r_pointbiserial"].values)
            ax.axvline(0, linestyle="--", linewidth=1)
            ax.set_xlabel("Corrélation point-bisériale avec RISQUE_BIN")
            ax.set_title("Corrélation (point-bisériale) vs cible")
            fig.tight_layout()
            fig.savefig(os.path.join(figdir, "barh_pointbiserial_vs_risque.png"))
            plt.close(fig)
    logger.info("Corrélations OK (NaN exclus, colonnes faibles/constantes retirées).")


# ----------------------- IMPUTATION ciblée + rapport -------------------------
def impute_selected_variables(df: pd.DataFrame, outroot: str) -> pd.DataFrame:
    """
    Impute uniquement les variables utiles au modèle (logique, robuste).
    Stratégies:
      - Numériques (robuste): MEDIANE (anti-outliers).
      - Catégorielles: "INCONNU".
    Variables concernées:
      NUM:  mois_non_declares, solde, mois_payes_spontane_dern_seg,
            anciennete_mois, recence_decl_mois, recence_seg_mois, ecart_mois_decl_vs_seg (si dispo)
      CAT:  regime, centre_impot, segment, activite
    Sorties:
      - reports/clean/cnps_imputed_selected.csv      (tableau final)
      - reports/eda/imputation_report.csv            (log imputations)
    """
    edadir = os.path.join(outroot, "eda")
    cleandir = os.path.join(outroot, "clean")
    os.makedirs(edadir, exist_ok=True); os.makedirs(cleandir, exist_ok=True)

    num_cols_cand = [
        "mois_non_declares", "solde", "mois_payes_spontane_dern_seg",
        "anciennete_mois", "recence_decl_mois", "recence_seg_mois", "ecart_mois_decl_vs_seg"
    ]
    cat_cols_cand = ["regime", "centre_impot", "segment", "activite"]

    num_cols = [c for c in num_cols_cand if c in df.columns]
    cat_cols = [c for c in cat_cols_cand if c in df.columns]

    out = pd.DataFrame(index=df.index)

    # --- Numériques: conversion + imputation médiane
    imputation_log = []
    for c in num_cols:
        s = pd.to_numeric(df[c], errors="coerce")
        miss_before = int(s.isna().sum())
        if s.notna().any():
            med = float(s.median())
            s = s.fillna(med)
            strategy = "median"
            param = med
        else:
            # Colonne entièrement NaN -> impute 0.0 par défaut, documenté
            s = s.fillna(0.0)
            strategy = "all_nan->0.0"
            param = 0.0
        out[c] = s.astype(float)
        miss_after = int(out[c].isna().sum())
        imputation_log.append({"variable": c, "type": "numeric",
                               "strategy": strategy, "param": param,
                               "missing_before": miss_before, "missing_after": miss_after})

    # --- Catégorielles: imputation "INCONNU"
    for c in cat_cols:
        s = df[c].astype("string")
        miss_before = int(s.isna().sum())
        s = s.fillna("INCONNU")
        out[c] = s
        miss_after = int(out[c].isna().sum())
        imputation_log.append({"variable": c, "type": "categorical",
                               "strategy": "fill='INCONNU'", "param": "INCONNU",
                               "missing_before": miss_before, "missing_after": miss_after})

    # + Remettre la cible si présente (sans imputer)
    if "RISQUE_BIN" in df.columns:
        out["RISQUE_BIN"] = df["RISQUE_BIN"]

    # Sauvegardes
    out.to_csv(os.path.join(cleandir, "cnps_imputed_selected.csv"), index=False, encoding="utf-8")
    pd.DataFrame(imputation_log).to_csv(os.path.join(edadir, "imputation_report.csv"), index=False, encoding="utf-8")
    logger.info("Imputation OK -> clean/cnps_imputed_selected.csv + eda/imputation_report.csv")
    return out


# --------------------------------- Main --------------------------------------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Chemin du fichier .xlsx ou .csv")
    parser.add_argument("--sheet", default=0, help="Nom/Index de feuille Excel (si .xlsx)")
    parser.add_argument("--outdir", default="reports/", help="Dossier de sortie")
    parser.add_argument("--date_ref", default=None, help="Date de référence YYYY-MM-DD (sinon aujourd'hui)")
    args = parser.parse_args()

    _ensure_dir(args.outdir)
    _ensure_dir(os.path.join(args.outdir, "figures"))
    _ensure_dir(os.path.join(args.outdir, "eda"))

    # Chargement & préparation
    df_raw = load_data(args.input, args.sheet)
    df = standardize_columns(df_raw.copy())
    df = clean_and_engineer(df, args.date_ref)

    # Sauvegarde dataset propre complet (avant drop final pour modèle)
    clean_dir = os.path.join(args.outdir, "clean")
    _ensure_dir(clean_dir)
    # Colonnes object -> string (robuste pour parquet)
    obj_cols = df.select_dtypes(include=["object"]).columns
    df[obj_cols] = df[obj_cols].astype("string")

    df.to_parquet(os.path.join(clean_dir, "cnps_clean.parquet"), index=False)
    df.to_csv(os.path.join(clean_dir, "cnps_clean.csv"), index=False, encoding="utf-8")
    logger.info("Dataset nettoyé sauvegardé dans %s", clean_dir)

        # ---------------- CORRÉLATIONS (sans NaN parasites) ----------------
    correlation_analysis(df, outroot=args.outdir, target_bin="RISQUE_BIN")

    # ---------------- IMPUTATION ciblée + rapport -----------------------
    _ = impute_selected_variables(df, outroot=args.outdir)
    logger.info("Imputation ciblée OK")

    # ---------------- EDA UNIVARIÉE ciblée ----------------
    uni_num, uni_cat, uni_tmp = univariate_analysis_targeted(df, outroot=args.outdir)
    logger.info("Analyse univariée (ciblée) OK")

    # ---------------- EDA BIVARIÉE vs RISQUE ----------------
    bi_num, bi_cat, bi_tmp = bivariate_vs_risk(df, outroot=args.outdir, target_bin="RISQUE_BIN")
    logger.info("Analyse bivariée (ciblée) OK")

    # Jeu d'entrée modèle (drop PII)
    df_model = df.drop(columns=[c for c in DROP_COLS_FOR_MODEL if c in df.columns])
    df_model.to_parquet(os.path.join(clean_dir, "cnps_model_input.parquet"), index=False)
    logger.info("Jeu d'entrée modèle sauvegardé.")

if __name__ == "__main__":
    main()
