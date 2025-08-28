import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BadgeRisque from './BadgeRisque';
import { Employeur } from '@/types';
import { secteurs, regions } from '@/data/mockData';
import { MapPin, Layers, Filter } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { Icon } from 'leaflet';

// Fix pour les icônes Leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface CarteRisqueProps {
  employeurs: Employeur[];
  className?: string;
}

const CarteRisque: React.FC<CarteRisqueProps> = ({ employeurs, className = '' }) => {
  const [filtreRegion, setFiltreRegion] = useState<string>('');
  const [filtreSecteur, setFiltreSecteur] = useState<string>('');
  const [filtreRisque, setFiltreRisque] = useState<string>('');
  const [showLegend, setShowLegend] = useState(true);

  // Position par défaut: Abidjan
  const position: [number, number] = [5.3600, -4.0083];

  // Filtrer les employeurs
  const employeursFiltres = employeurs.filter(emp => {
    const regionMatch = !filtreRegion || emp.region === filtreRegion;
    const secteurMatch = !filtreSecteur || emp.secteur === filtreSecteur;
    const risqueMatch = !filtreRisque || emp.niveauRisque === filtreRisque;
    return regionMatch && secteurMatch && risqueMatch;
  });

  // Fonction pour obtenir la couleur selon le niveau de risque
  const getRiskColor = (niveau: string) => {
    switch (niveau) {
      case 'Faible': return '#22c55e';   // vert
      case 'Moyen': return '#f59e0b';    // orange
      case 'Élevé': return '#f97316';    // orange foncé
      case 'Critique': return '#ef4444'; // rouge
      default: return '#6b7280';         // gris
    }
  };

  // Statistiques pour la légende
  const stats = {
    total: employeursFiltres.length,
    faible: employeursFiltres.filter(e => e.niveauRisque === 'Faible').length,
    moyen: employeursFiltres.filter(e => e.niveauRisque === 'Moyen').length,
    eleve: employeursFiltres.filter(e => e.niveauRisque === 'Élevé').length,
    critique: employeursFiltres.filter(e => e.niveauRisque === 'Critique').length,
  };

  return (
    <Card className={`glass-card ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Cartographie des Risques
          </div>
          <Badge variant="outline">
            {stats.total} employeur{stats.total > 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtres */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Select value={filtreRegion} onValueChange={setFiltreRegion}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Toutes les régions" />
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
            <Select value={filtreSecteur} onValueChange={setFiltreSecteur}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tous les secteurs" />
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
            <Select value={filtreRisque} onValueChange={setFiltreRisque}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Tous les risques" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous les risques</SelectItem>
                <SelectItem value="Faible">Risque Faible</SelectItem>
                <SelectItem value="Moyen">Risque Moyen</SelectItem>
                <SelectItem value="Élevé">Risque Élevé</SelectItem>
                <SelectItem value="Critique">Risque Critique</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowLegend(!showLegend)}
              className="w-full h-9"
            >
              <Layers className="h-4 w-4 mr-2" />
              {showLegend ? 'Masquer' : 'Afficher'} légende
            </Button>
          </div>
        </div>

        {/* Carte */}
        <div className="relative">
          <div className="h-96 w-full rounded-lg overflow-hidden border">
            <MapContainer
              center={position}
              zoom={8}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {employeursFiltres.map((employeur) => (
                <CircleMarker
                  key={employeur.id}
                  center={[employeur.coordonnees.lat, employeur.coordonnees.lng]}
                  radius={8}
                  fillColor={getRiskColor(employeur.niveauRisque)}
                  color={getRiskColor(employeur.niveauRisque)}
                  weight={2}
                  opacity={0.8}
                  fillOpacity={0.6}
                >
                  <Popup>
                    <div className="space-y-2 min-w-[200px]">
                      <div className="font-semibold">{employeur.nom}</div>
                      <div className="text-sm space-y-1">
                        <div><strong>Secteur:</strong> {employeur.secteur}</div>
                        <div><strong>Région:</strong> {employeur.region}</div>
                        <div><strong>Statut:</strong> {employeur.statut}</div>
                        <div className="flex items-center gap-2">
                          <strong>Risque:</strong>
                          <BadgeRisque niveau={employeur.niveauRisque} showScore score={employeur.scoreRisque} />
                        </div>
                        <div><strong>Effectifs CNPS:</strong> {employeur.cnps.effectifDeclare}</div>
                        <div><strong>Effectifs Impôts:</strong> {employeur.impots.effectifDeclare}</div>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>

          {/* Légende flottante */}
          {showLegend && (
            <div className="absolute top-4 right-4 bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg z-10">
              <div className="text-sm font-medium mb-2">Niveaux de risque</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Faible ({stats.faible})</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span>Moyen ({stats.moyen})</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span>Élevé ({stats.eleve})</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>Critique ({stats.critique})</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Concentration de risques */}
        {filtreRegion === 'Abidjan' && stats.critique + stats.eleve > 0 && (
          <div className="bg-orange-50 dark:bg-orange-950/20 border-l-4 border-orange-500 p-3 rounded">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
              <div>
                <div className="font-medium text-orange-800 dark:text-orange-200 text-sm">
                  Concentration de risques détectée
                </div>
                <div className="text-orange-700 dark:text-orange-300 text-xs mt-1">
                  {stats.critique + stats.eleve} employeur{stats.critique + stats.eleve > 1 ? 's' : ''} à risque élevé détecté{stats.critique + stats.eleve > 1 ? 's' : ''} dans la région d'Abidjan
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CarteRisque;