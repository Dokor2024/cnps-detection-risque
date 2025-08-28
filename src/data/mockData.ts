import { 
  Employeur, 
  User, 
  Secteur, 
  Region, 
  StatistiquesDashboard,
  HistoriqueEffectif,
  Anomalie,
  Commentaire,
  AlerteConfig
} from '../types';

// Secteurs d'activité
export const secteurs: Secteur[] = [
  { id: '1', nom: 'Commerce', code: 'COM', description: 'Commerce de gros et de détail' },
  { id: '2', nom: 'BTP', code: 'BTP', description: 'Bâtiment et travaux publics' },
  { id: '3', nom: 'Services', code: 'SRV', description: 'Services aux entreprises' },
  { id: '4', nom: 'Industrie', code: 'IND', description: 'Industries manufacturières' },
  { id: '5', nom: 'Transport', code: 'TRP', description: 'Transport et logistique' },
  { id: '6', nom: 'Agriculture', code: 'AGR', description: 'Agriculture et élevage' },
  { id: '7', nom: 'Restauration', code: 'REST', description: 'Hôtellerie et restauration' },
  { id: '8', nom: 'Santé', code: 'SNT', description: 'Santé et action sociale' },
];

// Régions
export const regions: Region[] = [
  { id: '1', nom: 'Abidjan', code: 'ABJ', coordonnees: { lat: 5.3600, lng: -4.0083 } },
  { id: '2', nom: 'Bouaké', code: 'BKE', coordonnees: { lat: 7.6944, lng: -5.0300 } },
  { id: '3', nom: 'San-Pédro', code: 'SPD', coordonnees: { lat: 4.7467, lng: -6.6364 } },
  { id: '4', nom: 'Yamoussoukro', code: 'YMS', coordonnees: { lat: 6.8276, lng: -5.2893 } },
  { id: '5', nom: 'Korhogo', code: 'KHG', coordonnees: { lat: 9.4580, lng: -5.6297 } },
  { id: '6', nom: 'Man', code: 'MAN', coordonnees: { lat: 7.4128, lng: -7.5539 } },
  { id: '7', nom: 'Daloa', code: 'DLA', coordonnees: { lat: 6.8775, lng: -6.4503 } },
  { id: '8', nom: 'Gagnoa', code: 'GGA', coordonnees: { lat: 6.1319, lng: -5.9506 } },
];

// Utilisateurs mock
export const users: User[] = [
  {
    id: '1',
    email: 'admin@cnps.ci',
    name: 'Koné Moussa',
    role: 'Admin',
    createdAt: new Date('2023-01-15')
  },
  {
    id: '2',
    email: 'analyste@cnps.ci',
    name: 'Diabaté Aminata',
    role: 'Analyste',
    createdAt: new Date('2023-03-20')
  },
  {
    id: '3',
    email: 'controleur@cnps.ci',
    name: 'Traoré Seydou',
    role: 'Contrôleur',
    createdAt: new Date('2023-02-10')
  },
];

// Fonction pour calculer le score de risque
export const calculerScoreRisque = (employeur: Partial<Employeur>): number => {
  let score = 0;
  
  // Si absent CNPS mais déclare des employés aux impôts
  if (!employeur.cnps?.affilie && (employeur.impots?.effectifDeclare || 0) > 0) {
    score += 0.4;
  }
  
  // Écart entre déclarations CNPS et Impôts
  const ecartEffectif = Math.abs(
    (employeur.cnps?.effectifDeclare || 0) - (employeur.impots?.effectifDeclare || 0)
  );
  const maxEffectif = Math.max(
    employeur.cnps?.effectifDeclare || 0,
    employeur.impots?.effectifDeclare || 0
  );
  
  if (maxEffectif > 0) {
    const pourcentageEcart = ecartEffectif / maxEffectif;
    score += pourcentageEcart * 0.3;
  }
  
  // Écart salarial important
  if ((employeur.ecartSalarial || 0) > 0.3) {
    score += 0.2;
  }
  
  // Anomalies détectées
  const anomaliesCritiques = (employeur.anomalies || []).filter(a => a.severite === 'Critique').length;
  score += anomaliesCritiques * 0.1;
  
  return Math.min(score, 1);
};

// Fonction pour déterminer le niveau de risque
export const getNiveauRisque = (score: number): 'Faible' | 'Moyen' | 'Élevé' | 'Critique' => {
  if (score >= 0.8) return 'Critique';
  if (score >= 0.6) return 'Élevé';
  if (score >= 0.3) return 'Moyen';
  return 'Faible';
};

// Générer des historiques d'effectifs
const genererHistoriqueEffectifs = (employeurId: string, effectifActuel: number): HistoriqueEffectif[] => {
  const historique: HistoriqueEffectif[] = [];
  const anneeActuelle = new Date().getFullYear();
  
  for (let annee = anneeActuelle - 2; annee <= anneeActuelle; annee++) {
    for (let mois = 1; mois <= 12; mois++) {
      if (annee === anneeActuelle && mois > new Date().getMonth() + 1) break;
      
      let effectifCnps = effectifActuel;
      let effectifImpots = effectifActuel;
      
      // Cas spécial: Entreprise ABC - anomalie en 2025
      if (employeurId === '1' && annee === 2025) {
        effectifCnps = 5;
        effectifImpots = 5;
      } else if (employeurId === '1' && annee === 2024) {
        effectifCnps = 20;
        effectifImpots = 20;
      } else {
        // Variations aléatoires normales
        const variationCnps = Math.floor(Math.random() * 6) - 3;
        const variationImpots = Math.floor(Math.random() * 4) - 2;
        effectifCnps = Math.max(0, effectifActuel + variationCnps);
        effectifImpots = Math.max(0, effectifActuel + variationImpots);
      }
      
      historique.push({
        id: `${employeurId}-${annee}-${mois}`,
        employeurId,
        annee,
        mois,
        effectifCnps,
        effectifImpots,
        ecart: Math.abs(effectifCnps - effectifImpots),
        source: Math.random() > 0.5 ? 'CNPS' : 'Impôts',
        createdAt: new Date(annee, mois - 1, 15)
      });
    }
  }
  
  return historique;
};

// Employeurs mock avec cas spécifiques
export const employeurs: Employeur[] = [
  {
    id: '1',
    nom: 'Entreprise ABC', // Cas spécifique pour fuzzy matching avec "Entreprise ABK"
    secteur: 'Commerce',
    region: 'Abidjan',
    ville: 'Abidjan',
    coordonnees: { lat: 5.3600, lng: -4.0083 },
    statut: 'En contrôle',
    scoreRisque: 0.9, // Score élevé - cas spécifique
    niveauRisque: 'Critique',
    cnps: {
      affilie: false, // Absent CNPS
      effectifDeclare: 0,
      derniereMiseAJour: new Date('2024-12-01')
    },
    impots: {
      numeroContribuable: 'CI123456789',
      effectifDeclare: 50, // 50 employés aux impôts - cas spécifique
      chiffreAffaires: 2500000,
      derniereMiseAJour: new Date('2024-12-15')
    },
    historiqueEffectifs: genererHistoriqueEffectifs('1', 50),
    createdAt: new Date('2023-06-15'),
    updatedAt: new Date('2024-12-20'),
    ecartSalarial: 0.6, // 60% d'écart - cas spécifique pour alertes
    anomalies: [
      {
        id: 'a1',
        type: 'Effectif',
        description: 'Baisse soudaine des effectifs déclarés',
        severite: 'Critique',
        dateDetection: new Date('2025-01-15'),
        statut: 'Nouvelle',
        valeurAttendue: 20,
        valeurConstatee: 5
      }
    ]
  },
  {
    id: '2',
    nom: 'Entreprise ABK', // Cas pour fuzzy matching avec "Entreprise ABC"
    secteur: 'BTP',
    region: 'Abidjan',
    ville: 'Abidjan',
    coordonnees: { lat: 5.3700, lng: -4.0100 },
    statut: 'Actif',
    scoreRisque: 0.3,
    niveauRisque: 'Moyen',
    cnps: {
      affilie: true,
      numeroAffiliation: 'CNPS001234',
      effectifDeclare: 25,
      derniereMiseAJour: new Date('2024-12-20')
    },
    impots: {
      numeroContribuable: 'CI987654321',
      effectifDeclare: 28,
      chiffreAffaires: 1800000,
      derniereMiseAJour: new Date('2024-12-18')
    },
    historiqueEffectifs: genererHistoriqueEffectifs('2', 25),
    createdAt: new Date('2023-08-20'),
    updatedAt: new Date('2024-12-20'),
    ecartSalarial: 0.15,
    anomalies: []
  },
  // Ajoutons d'autres employeurs pour avoir une concentration de risques à Abidjan
  {
    id: '3',
    nom: 'Construction Plateau SARL',
    secteur: 'BTP',
    region: 'Abidjan',
    ville: 'Abidjan',
    coordonnees: { lat: 5.3200, lng: -4.0200 },
    statut: 'Suspendu',
    scoreRisque: 0.85,
    niveauRisque: 'Critique',
    cnps: {
      affilie: false,
      effectifDeclare: 0,
      derniereMiseAJour: new Date('2024-10-01')
    },
    impots: {
      numeroContribuable: 'CI456789123',
      effectifDeclare: 35,
      chiffreAffaires: 3200000,
      derniereMiseAJour: new Date('2024-12-10')
    },
    historiqueEffectifs: genererHistoriqueEffectifs('3', 35),
    createdAt: new Date('2023-04-10'),
    updatedAt: new Date('2024-12-15'),
    ecartSalarial: 0.55, // Plus de 50% - cas pour alerte
    anomalies: [
      {
        id: 'a3',
        type: 'Déclaration',
        description: 'Aucune déclaration CNPS depuis 6 mois',
        severite: 'Élevé',
        dateDetection: new Date('2024-12-01'),
        statut: 'En cours',
        valeurAttendue: 35,
        valeurConstatee: 0
      }
    ]
  },
  {
    id: '4',
    nom: 'Commerce Treichville',
    secteur: 'Commerce',
    region: 'Abidjan',
    ville: 'Abidjan',
    coordonnees: { lat: 5.3100, lng: -4.0300 },
    statut: 'En contrôle',
    scoreRisque: 0.75,
    niveauRisque: 'Élevé',
    cnps: {
      affilie: true,
      numeroAffiliation: 'CNPS005678',
      effectifDeclare: 8,
      derniereMiseAJour: new Date('2024-12-18')
    },
    impots: {
      numeroContribuable: 'CI789123456',
      effectifDeclare: 22,
      chiffreAffaires: 1500000,
      derniereMiseAJour: new Date('2024-12-19')
    },
    historiqueEffectifs: genererHistoriqueEffectifs('4', 15),
    createdAt: new Date('2023-09-05'),
    updatedAt: new Date('2024-12-19'),
    ecartSalarial: 0.4,
    anomalies: [
      {
        id: 'a4',
        type: 'Effectif',
        description: 'Écart important entre déclarations CNPS et Impôts',
        severite: 'Élevé',
        dateDetection: new Date('2024-12-15'),
        statut: 'Nouvelle',
        valeurAttendue: 22,
        valeurConstatee: 8
      }
    ]
  },
  // Employeurs dans d'autres régions pour la diversité
  {
    id: '5',
    nom: 'Agro Business Bouaké',
    secteur: 'Agriculture',
    region: 'Bouaké',
    ville: 'Bouaké',
    coordonnees: { lat: 7.6944, lng: -5.0300 },
    statut: 'Actif',
    scoreRisque: 0.2,
    niveauRisque: 'Faible',
    cnps: {
      affilie: true,
      numeroAffiliation: 'CNPS009876',
      effectifDeclare: 45,
      derniereMiseAJour: new Date('2024-12-19')
    },
    impots: {
      numeroContribuable: 'CI321654987',
      effectifDeclare: 47,
      chiffreAffaires: 4200000,
      derniereMiseAJour: new Date('2024-12-20')
    },
    historiqueEffectifs: genererHistoriqueEffectifs('5', 45),
    createdAt: new Date('2023-02-28'),
    updatedAt: new Date('2024-12-20'),
    ecartSalarial: 0.05,
    anomalies: []
  },
  {
    id: '6',
    nom: 'Transport San-Pédro',
    secteur: 'Transport',
    region: 'San-Pédro',
    ville: 'San-Pédro',
    coordonnees: { lat: 4.7467, lng: -6.6364 },
    statut: 'Actif',
    scoreRisque: 0.45,
    niveauRisque: 'Moyen',
    cnps: {
      affilie: true,
      numeroAffiliation: 'CNPS011223',
      effectifDeclare: 18,
      derniereMiseAJour: new Date('2024-12-17')
    },
    impots: {
      numeroContribuable: 'CI654321789',
      effectifDeclare: 15,
      chiffreAffaires: 1200000,
      derniereMiseAJour: new Date('2024-12-16')
    },
    historiqueEffectifs: genererHistoriqueEffectifs('6', 18),
    createdAt: new Date('2023-11-12'),
    updatedAt: new Date('2024-12-17'),
    ecartSalarial: 0.25,
    anomalies: [
      {
        id: 'a6',
        type: 'Salaire',
        description: 'Salaire moyen déclaré inférieur au SMIG',
        severite: 'Moyen',
        dateDetection: new Date('2024-12-10'),
        statut: 'En cours',
        valeurAttendue: 75000,
        valeurConstatee: 52000
      }
    ]
  }
];

// Calculer les scores de risque pour tous les employeurs
employeurs.forEach(emp => {
  emp.scoreRisque = calculerScoreRisque(emp);
  emp.niveauRisque = getNiveauRisque(emp.scoreRisque);
});

// Commentaires mock
export const commentaires: Commentaire[] = [
  {
    id: '1',
    employeurId: '1',
    utilisateurId: '3',
    utilisateur: users[2],
    contenu: 'Vérifier la déclaration 2024 - écart important détecté',
    type: 'Contrôle',
    statut: 'À contrôler',
    createdAt: new Date('2024-12-18T10:30:00'),
  },
  {
    id: '2',
    employeurId: '3',
    utilisateurId: '2',
    utilisateur: users[1],
    contenu: 'Employeur absent des déclarations CNPS depuis 6 mois. Recommande un contrôle sur site.',
    type: 'Alerte',
    createdAt: new Date('2024-12-15T14:20:00'),
  },
  {
    id: '3',
    employeurId: '1',
    utilisateurId: '1',
    utilisateur: users[0],
    contenu: 'Cas prioritaire - score de risque critique. Planifier contrôle urgent.',
    type: 'Validation',
    statut: 'Validé',
    createdAt: new Date('2024-12-20T09:15:00'),
  }
];

// Statistiques du dashboard
export const statistiquesDashboard: StatistiquesDashboard = {
  totalEmployeurs: employeurs.length,
  employeursRisqueEleve: employeurs.filter(e => e.scoreRisque >= 0.6).length,
  employeursActifs: employeurs.filter(e => e.statut === 'Actif').length,
  nouveauxCetteSemaine: 3,
  
  repartitionRisque: {
    faible: employeurs.filter(e => e.niveauRisque === 'Faible').length,
    moyen: employeurs.filter(e => e.niveauRisque === 'Moyen').length,
    eleve: employeurs.filter(e => e.niveauRisque === 'Élevé').length,
    critique: employeurs.filter(e => e.niveauRisque === 'Critique').length,
  },
  
  evolutionMensuelle: [
    { mois: 'Août 2024', nouveaux: 12, controles: 8, anomalies: 3 },
    { mois: 'Sept 2024', nouveaux: 15, controles: 12, anomalies: 5 },
    { mois: 'Oct 2024', nouveaux: 18, controles: 15, anomalies: 7 },
    { mois: 'Nov 2024', nouveaux: 22, controles: 18, anomalies: 4 },
    { mois: 'Déc 2024', nouveaux: 25, controles: 20, anomalies: 8 },
  ],
  
  secteursRisque: [
    { secteur: 'BTP', nombreEmployeurs: 2, scoreRisqueMoyen: 0.8 },
    { secteur: 'Commerce', nombreEmployeurs: 2, scoreRisqueMoyen: 0.6 },
    { secteur: 'Transport', nombreEmployeurs: 1, scoreRisqueMoyen: 0.45 },
    { secteur: 'Agriculture', nombreEmployeurs: 1, scoreRisqueMoyen: 0.2 },
  ]
};

// Configuration d'alertes mock
export const alertesConfig: AlerteConfig[] = [
  {
    id: '1',
    nom: 'Écart salarial critique',
    description: 'Alerte lorsqu\'un employeur déclare un écart salarial supérieur à 50%',
    actif: true,
    conditions: {
      ecartSalarial: 0.5
    },
    notifications: {
      email: true,
      inApp: true,
      frequence: 'Immédiat'
    },
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-12-01')
  },
  {
    id: '2',
    nom: 'Score de risque élevé',
    description: 'Alerte pour les employeurs avec un score de risque supérieur à 0.8',
    actif: true,
    conditions: {
      scoreRisque: { min: 0.8 }
    },
    notifications: {
      email: true,
      inApp: true,
      frequence: 'Quotidien'
    },
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date('2024-11-15')
  }
];

export const currentUser = users[1]; // Utilisateur connecté par défaut