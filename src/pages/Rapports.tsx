import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import ExportDialog from '@/components/common/ExportDialog';
import AlertSubscription from '@/components/common/AlertSubscription';
import { FileText, Download, Sparkles, Bell, Settings, Loader2, Copy, Check } from 'lucide-react';
import { employeurs, statistiquesDashboard, secteurs, regions } from '@/data/mockData';
import { toast } from 'sonner';

const Rapports: React.FC = () => {
  const [ton, setTon] = useState<'professionnel' | 'technique' | 'executif'>('professionnel');
  const [detailLevel, setDetailLevel] = useState<'resume' | 'detaille' | 'complet'>('detaille');
  const [secteurFocus, setSecteurFocus] = useState<string>('');
  const [regionFocus, setRegionFocus] = useState<string>('');
  const [rapportGenere, setRapportGenere] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // valeur sentinelle pour Radix Select (évite value="")
  const ALL = '__ALL__';

  const employeursRisqueEleve = employeurs.filter(e => e.scoreRisque >= 0.6);
  const concentrationAbidjan = employeurs.filter(e => e.region === 'Abidjan' && e.scoreRisque >= 0.6);

  const genererRapport = async () => {
    setIsGenerating(true);
    
    // Simuler la génération IA
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const secteurTexte = secteurFocus ? ` dans le secteur ${secteurFocus}` : '';
    const regionTexte = regionFocus ? ` en région ${regionFocus}` : '';
    
    let rapport = '';
    
    if (ton === 'executif') {
      rapport = `SYNTHÈSE EXÉCUTIVE - ANALYSE DES RISQUES EMPLOYEURS${regionTexte}${secteurTexte}

POINTS CLÉS :
• ${statistiquesDashboard.employeursRisqueEleve} employeurs à risque élevé identifiés sur ${statistiquesDashboard.totalEmployeurs} analysés
• Concentration critique de ${concentrationAbidjan.length} employeurs à risque dans la région d'Abidjan
• Secteurs prioritaires : BTP et Commerce présentent les scores de risque les plus élevés

RECOMMANDATIONS STRATÉGIQUES :
1. Déployer immédiatement des équipes de contrôle à Abidjan 
2. Renforcer la surveillance des secteurs BTP et Commerce
3. Mettre en place un système d'alerte automatique pour les scores > 0.8

ACTIONS REQUISES :
- Planifier des contrôles sur site dans les 48h pour les cas critiques
- Réviser les procédures de déclaration CNPS
- Coordonner avec les services fiscaux pour croiser les données`;
    } else if (ton === 'technique') {
      rapport = `RAPPORT TECHNIQUE - ANALYSE DE RISQUE EMPLOYEURS${regionTexte}${secteurTexte}

MÉTHODOLOGIE :
• Algorithme de scoring basé sur 4 critères principaux
• Corrélation des données CNPS et fiscales
• Détection d'anomalies par apprentissage automatique

RÉSULTATS D'ANALYSE :
• Score moyen de risque : ${(employeurs.reduce((sum, e) => sum + e.scoreRisque, 0) / employeurs.length).toFixed(2)}
• Écart-type : 0.32 (forte variabilité)
• Seuil critique (≥0.8) : ${employeurs.filter(e => e.scoreRisque >= 0.8).length} cas détectés

ANOMALIES DÉTECTÉES :
• 12 employeurs non affiliés CNPS mais déclarant des employés
• ${employeurs.filter(e => Math.abs(e.cnps.effectifDeclare - e.impots.effectifDeclare) > 10).length} cas d'écarts significatifs (>10 employés)

VARIABLES PRÉDICTIVES :
1. Statut d'affiliation CNPS (coefficient 0.4)
2. Écart effectifs CNPS/Impôts (coefficient 0.3)
3. Écart salarial déclaré (coefficient 0.2)
4. Historique d'anomalies (coefficient 0.1)`;
    } else {
      rapport = `RAPPORT D'ANALYSE DES EMPLOYEURS${regionTexte}${secteurTexte}

SITUATION GÉNÉRALE :
Notre analyse révèle ${statistiquesDashboard.employeursRisqueEleve} employeurs nécessitant une attention particulière sur un total de ${statistiquesDashboard.totalEmployeurs} entités surveillées.

ZONES À RISQUE IDENTIFIÉES :
La région d'Abidjan présente une concentration préoccupante avec ${concentrationAbidjan.length} employeurs classés à risque élevé, principalement dans les secteurs du BTP et du commerce.

PRINCIPAUX CONSTATS :
• Entreprise ABC : Score critique (0.9) - Absent CNPS mais déclare 50 employés aux impôts
• Construction Plateau SARL : Score critique (0.85) - Aucune déclaration CNPS depuis 6 mois
• Commerce Treichville : Score élevé (0.75) - Écart important entre déclarations

RECOMMANDATIONS :
1. Planifier des contrôles sur site pour les employeurs à score critique
2. Renforcer la communication avec les secteurs BTP et Commerce
3. Mettre en place des alertes automatiques pour détecter les nouveaux cas à risque

Cette analyse suggère une action coordonnée entre les services CNPS et fiscaux pour régulariser les situations détectées.`;
    }

    setRapportGenere(rapport);
    setIsGenerating(false);
    toast.success('Rapport généré avec succès par l\'IA');
  };

  const copierRapport = async () => {
    try {
      await navigator.clipboard.writeText(rapportGenere);
      setCopied(true);
      toast.success('Rapport copié dans le presse-papiers');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Erreur lors de la copie');
    }
  };

  const telechargerRapport = () => {
    const blob = new Blob([rapportGenere], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.href = url;
    link.download = `rapport_employeurs_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Rapport téléchargé');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Génération de Rapports IA</h1>
          <p className="text-muted-foreground">
            Générez des rapports personnalisés avec l'intelligence artificielle
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <AlertSubscription>
            <Button variant="outline" className="gap-2">
              <Bell className="h-4 w-4" />
              Alertes
            </Button>
          </AlertSubscription>
          
          <ExportDialog employeurs={employeurs}>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export données
            </Button>
          </ExportDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration du rapport */}
        <div className="lg:col-span-1">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Ton du rapport</label>
                <Select value={ton} onValueChange={(value) => setTon(value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professionnel">Professionnel</SelectItem>
                    <SelectItem value="technique">Technique</SelectItem>
                    <SelectItem value="executif">Exécutif</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Niveau de détail</label>
                <Select value={detailLevel} onValueChange={(value) => setDetailLevel(value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resume">Résumé</SelectItem>
                    <SelectItem value="detaille">Détaillé</SelectItem>
                    <SelectItem value="complet">Complet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Focus secteur (optionnel)</label>
                <Select
                  value={secteurFocus}
                  onValueChange={(v: string) => setSecteurFocus(v === ALL ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les secteurs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Tous les secteurs</SelectItem>
                    {secteurs.map(secteur => (
                      <SelectItem key={secteur.id} value={secteur.nom}>
                        {secteur.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Focus région (optionnel)</label>
                <Select
                  value={regionFocus}
                  onValueChange={(v: string) => setRegionFocus(v === ALL ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les régions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Toutes les régions</SelectItem>
                    {regions.map(region => (
                      <SelectItem key={region.id} value={region.nom}>
                        {region.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <Button 
                onClick={genererRapport} 
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Générer avec l'IA
                  </>
                )}
              </Button>

              {/* Statistiques rapides */}
              <div className="pt-4 space-y-2">
                <div className="text-xs text-muted-foreground">Données d'entrée:</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Badge variant="outline">{employeurs.length} employeurs</Badge>
                  <Badge variant="outline" className="text-red-600">{employeursRisqueEleve.length} à risque</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rapport généré */}
        <div className="lg:col-span-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Rapport Généré
                </div>
                {rapportGenere && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copierRapport}
                      className="gap-2"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? 'Copié!' : 'Copier'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={telechargerRapport}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Télécharger
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rapportGenere ? (
                <div className="space-y-4">
                  <Textarea
                    value={rapportGenere}
                    readOnly
                    className="min-h-[500px] font-mono text-sm resize-none"
                  />
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Généré le {new Date().toLocaleString('fr-FR')}</span>
                    <span>{rapportGenere.length} caractères</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-medium mb-2">Aucun rapport généré</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configurez les paramètres et cliquez sur "Générer avec l'IA" pour créer votre rapport personnalisé.
                  </p>
                  <div className="text-xs text-muted-foreground">
                    L'IA analysera les données des {employeurs.length} employeurs selon vos critères
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Rapports;
