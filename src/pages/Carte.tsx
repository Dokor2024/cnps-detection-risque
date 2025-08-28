import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CarteRisque from '@/components/common/CarteRisque';
import ExportDialog from '@/components/common/ExportDialog';
import { employeurs, secteurs, regions } from '@/data/mockData';
import { Download, Filter } from 'lucide-react';

const Carte: React.FC = () => {
  const [filtreRegion, setFiltreRegion] = useState<string>('');
  const [filtreSecteur, setFiltreSecteur] = useState<string>('');
  const [filtreRisque, setFiltreRisque] = useState<string>('');

  // Filtrer les employeurs
  const employeursFiltres = employeurs.filter(emp => {
    const regionMatch = !filtreRegion || emp.region === filtreRegion;
    const secteurMatch = !filtreSecteur || emp.secteur === filtreSecteur;
    const risqueMatch = !filtreRisque || emp.niveauRisque === filtreRisque;
    return regionMatch && secteurMatch && risqueMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Cartographie des Risques</h1>
          <p className="text-muted-foreground">
            Visualisation géographique des employeurs par niveau de risque
          </p>
        </div>
        
        <ExportDialog employeurs={employeursFiltres}>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exporter la carte
          </Button>
        </ExportDialog>
      </div>

      {/* Filtres globaux */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 glass-card rounded-lg">
        <div>
          <label className="text-sm font-medium mb-2 block">Région</label>
          <Select value={filtreRegion} onValueChange={setFiltreRegion}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Toutes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Toutes les régions</SelectItem>
              {regions.map(region => (
                <SelectItem key={region.id} value={region.nom}>
                  {region.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Secteur</label>
          <Select value={filtreSecteur} onValueChange={setFiltreSecteur}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les secteurs</SelectItem>
              {secteurs.map(secteur => (
                <SelectItem key={secteur.id} value={secteur.nom}>
                  {secteur.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Niveau de risque</label>
          <Select value={filtreRisque} onValueChange={setFiltreRisque}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Tous les niveaux</SelectItem>
              <SelectItem value="Faible">Faible</SelectItem>
              <SelectItem value="Moyen">Moyen</SelectItem>
              <SelectItem value="Élevé">Élevé</SelectItem>
              <SelectItem value="Critique">Critique</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button 
            variant="outline" 
            onClick={() => {
              setFiltreRegion('');
              setFiltreSecteur('');
              setFiltreRisque('');
            }}
            className="h-9 w-full"
          >
            <Filter className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
        </div>
      </div>

      <CarteRisque employeurs={employeursFiltres} />
    </div>
  );
};

export default Carte;