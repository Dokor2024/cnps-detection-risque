# Système d'Analyse de Risque CNPS

Un système complet d'analyse et de surveillance des risques pour les employeurs, développé avec React + TypeScript + Vite.

## 🚀 Fonctionnalités

### Authentification & Autorisation
- ✅ Connexion, inscription, mot de passe oublié
- ✅ Gestion des rôles (Analyste, Contrôleur, Admin)
- ✅ Contrôle d'accès basé sur les rôles (RBAC)

### Tableau de Bord
- ✅ KPI en temps réel
- ✅ Graphiques interactifs avec Recharts
- ✅ Répartition des risques par niveau
- ✅ Filtres dynamiques

### Recherche Avancée
- ✅ Recherche floue avec Fuse.js (tolérance aux fautes)
- ✅ Autocomplétion intelligente
- ✅ Filtres multiples (secteur, région, statut, risque)
- ✅ Résultats avec pagination et tri

### Cartographie
- ✅ Carte interactive avec React-Leaflet
- ✅ Points colorés selon le score de risque
- ✅ Clustering et filtres géographiques
- ✅ Popups d'information détaillées

### Analyse de Risque
- ✅ Calcul automatique des scores
- ✅ Badges visuels (vert, orange, rouge)
- ✅ Jauges de progression
- ✅ Détection d'anomalies

### Collaboration
- ✅ Système de commentaires
- ✅ Timeline des actions
- ✅ Notifications in-app avec React-Toastify
- ✅ Statuts de validation par rôle

### Rapports IA
- ✅ Génération automatique de rapports
- ✅ Personnalisation (ton, niveau de détail)
- ✅ Export CSV/PDF
- ✅ Alertes configurables

## 🛠️ Technologies

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + shadcn/ui
- **Graphiques**: Recharts
- **Cartographie**: React-Leaflet + Leaflet
- **Recherche**: Fuse.js (fuzzy matching)
- **Notifications**: React-Toastify
- **Navigation**: React Router DOM
- **State**: React Query + Context API

## 📦 Installation

```bash
# Cloner le projet
git clone <votre-repo>
cd cnps-risk-analyzer

# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Build pour production
npm run build

# Prévisualiser le build
npm run preview
```

## 🔧 Scripts

```bash
npm run dev          # Serveur de développement
npm run build        # Build de production
npm run preview      # Aperçu du build
npm run lint         # Linter ESLint
npm run test         # Tests unitaires
```

## 🏗️ Structure du Projet

```
src/
├── components/          # Composants réutilisables
│   ├── common/         # BadgeRisque, JaugeScore, etc.
│   ├── layout/         # Sidebar, Layout
│   └── ui/             # shadcn/ui components
├── data/               # Données mock
│   └── mockData.ts     # Employeurs, secteurs, régions
├── pages/              # Pages de l'application
│   ├── auth/           # Login, Register, ForgotPassword
│   ├── Dashboard.tsx   # Tableau de bord
│   ├── Recherche.tsx   # Recherche avancée
│   ├── Carte.tsx       # Cartographie
│   └── Rapports.tsx    # Génération de rapports
├── services/           # Services métier
│   ├── authService.ts  # Authentification
│   ├── searchService.ts # Recherche floue
│   └── reportService.ts # Génération de rapports
├── types/              # Types TypeScript
└── hooks/              # Hooks personnalisés
```

## 👥 Comptes de Démonstration

| Rôle | Email | Mot de passe | Permissions |
|------|-------|-------------|-------------|
| Admin | admin@cnps.ci | admin123 | Accès complet |
| Contrôleur | controleur@cnps.ci | controleur123 | Validation, contrôles |
| Analyste | analyste@cnps.ci | analyste123 | Consultation, analyse |

## 🎯 Cas d'Usage Implémentés

### Recherche Floue
- Recherche "Entreprise ABC" → propose "Entreprise ABK"
- Tolérance aux fautes de frappe
- Suggestions intelligentes

### Calcul de Risque
- Entreprise absent CNPS + 50 employés Impôts = Score 0.9 (critique)
- Écarts entre déclarations CNPS/Impôts
- Anomalies détectées automatiquement

### Cartographie
- Concentration de points rouges à Abidjan
- Filtres par région et secteur
- Clustering intelligent

### Détection d'Anomalies
- Baisse soudaine: 20 employés (2024) → 5 (2025)
- Écarts salariaux > 50%
- Alertes automatiques

### Génération de Rapports IA
Exemple de rapport généré:
> "Région d'Abidjan : 12 employeurs non affiliés détectés, secteurs commerce et BTP. Recommandation : planifier des contrôles sur site."

## 🚦 Performance

- ✅ Code-splitting avec React.lazy
- ✅ Debounce sur la recherche (300ms)
- ✅ Memoisation avec React.memo, useMemo, useCallback
- ✅ Virtualisation des listes volumineuses
- ✅ Optimisation des images et assets

## 🔒 Sécurité

- ✅ Contrôle d'accès par rôle (RBAC)
- ✅ Validation côté client
- ✅ Tokens de session simulés
- ✅ Protection des routes privées

## 🎨 Design System

Le projet utilise un design system cohérent avec:
- Couleurs sémantiques (HSL)
- Tokens de design réutilisables
- Thème sombre optimisé
- Composants accessibles (ARIA)

## 📱 Responsive

- ✅ Mobile-first design
- ✅ Breakpoints adaptatifs
- ✅ Navigation mobile optimisée
- ✅ Cartes et graphiques responsives

## 🧪 Tests

Des tests unitaires sont inclus pour:
- Calcul des scores de risque
- Fuzzy matching
- Détection d'anomalies
- Utilitaires métier

```bash
npm run test
```

## 🚀 Déploiement

Le projet est prêt pour le déploiement sur:
- Vercel
- Netlify
- GitHub Pages
- Serveur traditionnel

## 📄 Licence

MIT - Voir le fichier LICENSE pour plus de détails.

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📞 Support

Pour toute question ou support, contactez l'équipe de développement.