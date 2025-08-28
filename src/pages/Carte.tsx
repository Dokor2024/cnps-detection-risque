import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CarteRisque from '@/components/common/CarteRisque';
import ExportDialog from '@/components/common/ExportDialog';
import { employeurs, secteurs, regions } from '@/data/mockData';
import { Download, Filter } from 'lucide-react';

const ALL = 'all';

const Carte: React.FC = () => {
  const [filtreRegion, setFiltreRegion] = useState<string | undefined>(undefined);
  const [filtreSecteur, setFiltreSecteur] = useState<string | undefined>(undefined);
  const [filtreRisque, setFiltreRisque] = useState<string | undefined>(undefined);

  // Filtrer les employeurs (memo pour éviter les recalculs)
  const employeursFiltres = useMemo(() => {
    return employeurs.filter((emp) => {
      const regionMatch  = !filtreRegion  || filtreRegion  === ALL || emp.region       === filtreRegion;
      const secteurMatch = !filtreSecteur || filtreSecteur === ALL || emp.secteur      === filtreSecteur;
      const risqueMatch  = !filtreRisque  || filtreRisque  === ALL || emp.niveauRisque === filtreRisque;
      return regionMatch && secteurMatch && risqueMatch;
    });
  }, [filtreRegion, filtreSecteur, filtreRisque]);

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
        {/* Région */}
        <div>
          <label className="text-sm font-medium mb-2 block">Région</label>
          <Select
            value={filtreRegion}
            onValueChange={(v) => setFiltreRegion(v === ALL ? undefined : v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Toutes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toutes les régions</SelectItem>
              {regions.map((region) => (
                <SelectItem key={region.id} value={String(region.nom)}>
                  {region.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Secteur */}
        <div>
          <label className="text-sm font-medium mb-2 block">Secteur</label>
          <Select
            value={filtreSecteur}
            onValueChange={(v) => setFiltreSecteur(v === ALL ? undefined : v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous les secteurs</SelectItem>
              {secteurs.map((secteur) => (
                <SelectItem key={secteur.id} value={String(secteur.nom)}>
                  {secteur.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Risque */}
        <div>
          <label className="text-sm font-medium mb-2 block">Niveau de risque</label>
          <Select
            value={filtreRisque}
            onValueChange={(v) => setFiltreRisque(v === ALL ? undefined : v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous les niveaux</SelectItem>
              <SelectItem value="Faible">Faible</SelectItem>
              <SelectItem value="Moyen">Moyen</SelectItem>
              <SelectItem value="Élevé">Élevé</SelectItem>
              <SelectItem value="Critique">Critique</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reset */}
        <div className="flex items-end">
          <Button
            variant="outline"
            onClick={() => {
              setFiltreRegion(undefined);
              setFiltreSecteur(undefined);
              setFiltreRisque(undefined);
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
