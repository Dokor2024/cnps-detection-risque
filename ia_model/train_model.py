import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
import joblib

# 📥 Charger les données (à adapter avec ton chemin réel)
df = pd.read_csv("../data/employeurs.csv")

# 🧹 Nettoyage de base
df = df.dropna(subset=["score_risque", "effectif_declare", "salaire_total"])
df["risque"] = df["score_risque"].apply(lambda x: 1 if x >= 0.8 else 0)

# 🔢 Encodage des colonnes catégorielles
df = pd.get_dummies(df, columns=["secteur_activite", "localisation"], drop_first=True)

# 🎯 Séparation des variables
X = df.drop(columns=["risque", "score_risque", "raison_sociale", "nif", "nui"])
y = df["risque"]

# ✂️ Split train / test
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# 🚀 Entraînement du modèle
model = RandomForestClassifier()
model.fit(X_train, y_train)

# 📊 Évaluation
y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred))

# 💾 Sauvegarde du modèle
joblib.dump(model, "model_risque.joblib")
print("✅ Modèle entraîné et sauvegardé avec succès.")
