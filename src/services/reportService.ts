import { RapportIA, Employeur, StatistiquesDashboard } from '../types';
import { employeurs, statistiquesDashboard } from '../data/mockData';

class ReportService {
  // Génération de rapport par IA (simulé)
  async generateReport(parametres: RapportIA['parametres']): Promise<RapportIA> {
    // Simulation d'un délai de génération
    await new Promise(resolve => setTimeout(resolve, 2000));

    const rapport: RapportIA = {
      id: Date.now().toString(),
      titre: this.generateTitle(parametres),
      contenu: this.generateContent(parametres),
      type: this.determineReportType(parametres),
      parametres,
      createdAt: new Date(),
      createdBy: 'current_user_id'
    };

    return rapport;
  }

  private generateTitle(parametres: RapportIA['parametres']): string {
    const { ton, regions, secteurs } = parametres;
    
    let titre = 'Analyse des Risques - ';
    
    if (regions && regions.length > 0) {
      titre += `Région ${regions[0]}`;
    } else if (secteurs && secteurs.length > 0) {
      titre += `Secteur ${secteurs[0]}`;
    } else {
      titre += 'Vue d\'ensemble';
    }

    if (ton === 'Exécutif') {
      titre += ' - Résumé Exécutif';
    }

    return titre;
  }

  private generateContent(parametres: RapportIA['parametres']): string {
    const { ton, niveauDetail, regions, secteurs } = parametres;
    
    let contenu = '';

    // Analyse spécifique selon les paramètres
    if (regions?.includes('Abidjan')) {
      contenu += this.generateAbidjanAnalysis(ton, niveauDetail);
    } else if (secteurs?.includes('BTP')) {
      contenu += this.generateBTPAnalysis(ton, niveauDetail);
    } else {
      contenu += this.generateGeneralAnalysis(ton, niveauDetail);
    }

    return contenu;
  }

  private generateAbidjanAnalysis(ton: string, detail: string): string {
    const employeursAbidjan = employeurs.filter(e => e.region === 'Abidjan');
    const risqueEleve = employeursAbidjan.filter(e => e.scoreRisque >= 0.6);

    let contenu = '';

    if (ton === 'Exécutif') {
      contenu = `**RÉSUMÉ EXÉCUTIF - RÉGION D'ABIDJAN**

**Points Clés:**
• ${risqueEleve.length} employeurs à risque élevé identifiés sur ${employeursAbidjan.length} total
• Concentration critique dans les secteurs BTP et Commerce
• Recommandation urgente de contrôles sur site

**Actions Prioritaires:**
1. Planifier des contrôles immédiats pour les 4 employeurs critiques
2. Renforcer la surveillance des déclarations CNPS
3. Mettre en place un suivi mensuel renforcé`;
    } else {
      contenu = `**ANALYSE DÉTAILLÉE - RÉGION D'ABIDJAN**

**Vue d'ensemble:**
La région d'Abidjan présente une concentration préoccupante d'employeurs à risque élevé. Sur les ${employeursAbidjan.length} employeurs recensés, ${risqueEleve.length} présentent un score de risque supérieur à 0,6.

**Secteurs à risque:**
- **BTP:** 2 employeurs identifiés avec des scores critiques
- **Commerce:** 2 employeurs présentant des écarts significatifs

**Cas spécifiques:**
- Entreprise ABC: Absent CNPS mais déclare 50 employés aux Impôts (score 0.9)
- Construction Plateau SARL: Aucune déclaration CNPS depuis 6 mois (score 0.85)

**Recommandations:**
1. **Contrôles sur site immédiats** pour les employeurs avec score > 0.8
2. **Vérification croisée** des déclarations CNPS/Impôts
3. **Mise en demeure** pour les employeurs non-affiliés CNPS
4. **Suivi mensuel renforcé** pendant 6 mois

**Prochaines étapes:**
- Planifier 4 contrôles sur site dans les 15 prochains jours
- Coordonner avec les services des Impôts pour validation croisée
- Établir un protocole de suivi spécifique pour cette région`;
    }

    return contenu;
  }

  private generateBTPAnalysis(ton: string, detail: string): string {
    const employeursBTP = employeurs.filter(e => e.secteur === 'BTP');
    const scoreTotal = employeursBTP.reduce((sum, e) => sum + e.scoreRisque, 0);
    const scoreMoyen = scoreTotal / employeursBTP.length;

    return `**ANALYSE SECTEUR BTP**

**Indicateurs Clés:**
• ${employeursBTP.length} employeurs recensés
• Score de risque moyen: ${(scoreMoyen * 100).toFixed(1)}%
• ${employeursBTP.filter(e => e.scoreRisque >= 0.6).length} employeurs à risque élevé

**Principales Anomalies:**
- Écarts importants entre déclarations CNPS et Impôts
- Sous-déclaration récurrente des effectifs
- Non-affiliation CNPS pour certaines entreprises actives

**Recommandations Sectorielles:**
1. Renforcer les contrôles préventifs dans le BTP
2. Sensibilisation des entreprises aux obligations CNPS
3. Mise en place d'un suivi sectoriel mensuel`;
  }

  private generateGeneralAnalysis(ton: string, detail: string): string {
    const stats = statistiquesDashboard;
    
    return `**ANALYSE GÉNÉRALE DU RISQUE**

**Vue d'ensemble:**
Le système de surveillance a identifié ${stats.employeursRisqueEleve} employeurs présentant un niveau de risque élevé sur un total de ${stats.totalEmployeurs} entités surveillées.

**Répartition des Risques:**
• **Risque Faible:** ${stats.repartitionRisque.faible} employeurs (${((stats.repartitionRisque.faible/stats.totalEmployeurs)*100).toFixed(1)}%)
• **Risque Moyen:** ${stats.repartitionRisque.moyen} employeurs (${((stats.repartitionRisque.moyen/stats.totalEmployeurs)*100).toFixed(1)}%)
• **Risque Élevé:** ${stats.repartitionRisque.eleve} employeurs (${((stats.repartitionRisque.eleve/stats.totalEmployeurs)*100).toFixed(1)}%)
• **Risque Critique:** ${stats.repartitionRisque.critique} employeurs (${((stats.repartitionRisque.critique/stats.totalEmployeurs)*100).toFixed(1)}%)

**Tendances:**
L'évolution mensuelle montre une augmentation des détections d'anomalies, signe de l'efficacité du système de surveillance mis en place.

**Recommandations Stratégiques:**
1. **Priorisation:** Concentrer les efforts sur les ${stats.employeursRisqueEleve} employeurs à risque élevé
2. **Prévention:** Renforcer la communication sur les obligations CNPS
3. **Automatisation:** Développer les alertes automatiques pour une détection plus rapide
4. **Formation:** Sensibiliser les équipes aux nouveaux indicateurs de risque`;
  }

  private determineReportType(parametres: RapportIA['parametres']): RapportIA['type'] {
    if (parametres.employeurs && parametres.employeurs.length > 0) {
      return 'Employeur spécifique';
    }
    if (parametres.regions && parametres.regions.length > 0) {
      return 'Région spécifique';
    }
    if (parametres.secteurs && parametres.secteurs.length > 0) {
      return 'Secteur spécifique';
    }
    return 'Analyse générale';
  }

  // Export des données filtrées
  async exportData(employeurs: Employeur[], format: 'CSV' | 'PDF' = 'CSV'): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (format === 'CSV') {
      return this.generateCSV(employeurs);
    } else {
      return this.generatePDFContent(employeurs);
    }
  }

  private generateCSV(employeurs: Employeur[]): string {
    const headers = [
      'Nom',
      'Secteur',
      'Région',
      'Statut',
      'Score Risque',
      'Niveau Risque',
      'Effectif CNPS',
      'Effectif Impôts',
      'Écart',
      'Dernière MAJ'
    ].join(',');

    const rows = employeurs.map(emp => [
      `"${emp.nom}"`,
      `"${emp.secteur}"`,
      `"${emp.region}"`,
      `"${emp.statut}"`,
      emp.scoreRisque.toFixed(2),
      `"${emp.niveauRisque}"`,
      emp.cnps.effectifDeclare,
      emp.impots.effectifDeclare,
      Math.abs(emp.cnps.effectifDeclare - emp.impots.effectifDeclare),
      emp.updatedAt.toISOString().split('T')[0]
    ].join(','));

    return [headers, ...rows].join('\n');
  }

  private generatePDFContent(employeurs: Employeur[]): string {
    return `
RAPPORT D'ANALYSE DES EMPLOYEURS
================================

Date de génération: ${new Date().toLocaleDateString('fr-FR')}
Nombre d'employeurs: ${employeurs.length}

RÉSUMÉ:
${employeurs.filter(e => e.niveauRisque === 'Critique').length} employeurs critiques
${employeurs.filter(e => e.niveauRisque === 'Élevé').length} employeurs à risque élevé
${employeurs.filter(e => e.niveauRisque === 'Moyen').length} employeurs à risque moyen
${employeurs.filter(e => e.niveauRisque === 'Faible').length} employeurs à risque faible

DÉTAIL DES EMPLOYEURS:
${employeurs.map(emp => `
- ${emp.nom} (${emp.secteur})
  Région: ${emp.region}
  Score de risque: ${(emp.scoreRisque * 100).toFixed(1)}%
  Statut: ${emp.statut}
`).join('')}
    `.trim();
  }
}

export const reportService = new ReportService();