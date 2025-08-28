import Fuse from 'fuse.js';
import { Employeur, FiltreRecherche } from '../types';
import { employeurs } from '../data/mockData';

class SearchService {
  private fuse: Fuse<Employeur>;

  constructor() {
    // Configuration de Fuse.js pour la recherche floue
    const fuseOptions = {
      keys: [
        { name: 'nom', weight: 0.7 },
        { name: 'secteur', weight: 0.2 },
        { name: 'region', weight: 0.1 }
      ],
      threshold: 0.4, // Plus tolérant aux fautes (0 = exact, 1 = très permissif)
      distance: 100,
      includeScore: true,
      includeMatches: true,
      minMatchCharLength: 2,
      findAllMatches: true
    };

    this.fuse = new Fuse(employeurs, fuseOptions);
  }

  // Recherche avec fuzzy matching
  searchEmployeurs(terme: string): { item: Employeur; score?: number; matches?: readonly any[] }[] {
    if (!terme.trim()) {
      return employeurs.map(item => ({ item }));
    }

    const results = this.fuse.search(terme);
    return results.map(result => ({
      item: result.item,
      score: result.score,
      matches: result.matches
    }));
  }

  // Recherche avec filtres avancés
  searchWithFilters(filtres: FiltreRecherche): Employeur[] {
    let resultats = [...employeurs];

    // Recherche textuelle floue
    if (filtres.terme) {
      const fuzzyResults = this.searchEmployeurs(filtres.terme);
      const ids = new Set(fuzzyResults.map(r => r.item.id));
      resultats = resultats.filter(emp => ids.has(emp.id));
    }

    // Filtrer par secteurs
    if (filtres.secteurs && filtres.secteurs.length > 0) {
      resultats = resultats.filter(emp => filtres.secteurs!.includes(emp.secteur));
    }

    // Filtrer par régions
    if (filtres.regions && filtres.regions.length > 0) {
      resultats = resultats.filter(emp => filtres.regions!.includes(emp.region));
    }

    // Filtrer par statuts
    if (filtres.statuts && filtres.statuts.length > 0) {
      resultats = resultats.filter(emp => filtres.statuts!.includes(emp.statut));
    }

    // Filtrer par niveaux de risque
    if (filtres.niveauxRisque && filtres.niveauxRisque.length > 0) {
      resultats = resultats.filter(emp => filtres.niveauxRisque!.includes(emp.niveauRisque));
    }

    // Filtrer par score de risque
    if (filtres.scoreMin !== undefined) {
      resultats = resultats.filter(emp => emp.scoreRisque >= filtres.scoreMin!);
    }

    if (filtres.scoreMax !== undefined) {
      resultats = resultats.filter(emp => emp.scoreRisque <= filtres.scoreMax!);
    }

    // Filtrer par date
    if (filtres.dateDebut) {
      resultats = resultats.filter(emp => emp.updatedAt >= filtres.dateDebut!);
    }

    if (filtres.dateFin) {
      resultats = resultats.filter(emp => emp.updatedAt <= filtres.dateFin!);
    }

    return resultats;
  }

  // Suggestions pour l'autocomplétion
  getSuggestions(terme: string, limit: number = 5): string[] {
    if (!terme.trim() || terme.length < 2) {
      return [];
    }

    const results = this.searchEmployeurs(terme);
    const suggestions = new Set<string>();

    results.slice(0, limit * 2).forEach(result => {
      // Ajouter le nom exact
      suggestions.add(result.item.nom);

      // Ajouter des variantes basées sur les matches
      if (result.matches) {
        result.matches.forEach(match => {
          if (match.key === 'nom') {
            suggestions.add(result.item.nom);
          }
        });
      }
    });

    return Array.from(suggestions).slice(0, limit);
  }

  // Recherche par proximité géographique
  searchByLocation(lat: number, lng: number, radiusKm: number = 10): Employeur[] {
    return employeurs.filter(emp => {
      const distance = this.calculateDistance(
        lat, lng,
        emp.coordonnees.lat, emp.coordonnees.lng
      );
      return distance <= radiusKm;
    });
  }

  // Calculer la distance entre deux points (formule de Haversine)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance en km
    return d;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export const searchService = new SearchService();