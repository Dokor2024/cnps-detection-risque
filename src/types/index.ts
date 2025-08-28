export interface User {
  id: string;
  email: string;
  name: string;
  role: 'Analyste' | 'Contrôleur' | 'Admin';
  avatar?: string;
  createdAt: Date;
}

export interface Employeur {
  id: string;
  nom: string;
  secteur: string;
  region: string;
  ville: string;
  coordonnees: {
    lat: number;
    lng: number;
  };
  statut: 'Actif' | 'Inactif' | 'Suspendu' | 'En contrôle';
  scoreRisque: number;
  niveauRisque: 'Faible' | 'Moyen' | 'Élevé' | 'Critique';
  
  // Données de déclarations
  cnps: {
    affilie: boolean;
    numeroAffiliation?: string;
    effectifDeclare: number;
    derniereMiseAJour: Date;
  };
  
  impots: {
    numeroContribuable: string;
    effectifDeclare: number;
    chiffreAffaires?: number;
    derniereMiseAJour: Date;
  };
  
  // Historique des effectifs
  historiqueEffectifs: HistoriqueEffectif[];
  
  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
  lastControlDate?: Date;
  
  // Écarts et anomalies
  ecartSalarial?: number;
  anomalies: Anomalie[];
}

export interface HistoriqueEffectif {
  id: string;
  employeurId: string;
  annee: number;
  mois: number;
  effectifCnps: number;
  effectifImpots: number;
  ecart: number;
  source: 'CNPS' | 'Impôts' | 'Contrôle';
  createdAt: Date;
}

export interface Anomalie {
  id: string;
  type: 'Effectif' | 'Salaire' | 'Déclaration' | 'Géographique';
  description: string;
  severite: 'Faible' | 'Moyen' | 'Élevé' | 'Critique';
  dateDetection: Date;
  statut: 'Nouvelle' | 'En cours' | 'Résolue' | 'Ignorée';
  valeurAttendue?: number;
  valeurConstatee?: number;
}

export interface Commentaire {
  id: string;
  employeurId: string;
  utilisateurId: string;
  utilisateur: User;
  contenu: string;
  type: 'Note' | 'Validation' | 'Alerte' | 'Contrôle';
  statut?: 'À contrôler' | 'Validé' | 'Rejeté';
  createdAt: Date;
  updatedAt?: Date;
  reponseA?: string;
  reponses?: Commentaire[];
}

export interface Secteur {
  id: string;
  nom: string;
  code: string;
  description?: string;
}

export interface Region {
  id: string;
  nom: string;
  code: string;
  coordonnees: {
    lat: number;
    lng: number;
  };
}

export interface FiltreRecherche {
  terme?: string;
  secteurs?: string[];
  regions?: string[];
  statuts?: string[];
  niveauxRisque?: string[];
  scoreMin?: number;
  scoreMax?: number;
  dateDebut?: Date;
  dateFin?: Date;
}

export interface StatistiquesDashboard {
  totalEmployeurs: number;
  employeursRisqueEleve: number;
  employeursActifs: number;
  nouveauxCetteSemaine: number;
  
  // Répartition par risque
  repartitionRisque: {
    faible: number;
    moyen: number;
    eleve: number;
    critique: number;
  };
  
  // Évolution mensuelle
  evolutionMensuelle: {
    mois: string;
    nouveaux: number;
    controles: number;
    anomalies: number;
  }[];
  
  // Top secteurs à risque
  secteursRisque: {
    secteur: string;
    nombreEmployeurs: number;
    scoreRisqueMoyen: number;
  }[];
}

export interface AlerteConfig {
  id: string;
  nom: string;
  description: string;
  actif: boolean;
  conditions: {
    scoreRisque?: {
      min?: number;
      max?: number;
    };
    ecartEffectif?: number;
    ecartSalarial?: number;
    secteurs?: string[];
    regions?: string[];
  };
  notifications: {
    email: boolean;
    inApp: boolean;
    frequence: 'Immédiat' | 'Quotidien' | 'Hebdomadaire';
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface RapportIA {
  id: string;
  titre: string;
  contenu: string;
  type: 'Analyse générale' | 'Secteur spécifique' | 'Région spécifique' | 'Employeur spécifique';
  parametres: {
    ton: 'Professionnel' | 'Détaillé' | 'Exécutif';
    niveauDetail: 'Résumé' | 'Standard' | 'Complet';
    secteurs?: string[];
    regions?: string[];
    employeurs?: string[];
  };
  createdAt: Date;
  createdBy: string;
}

export interface PaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}