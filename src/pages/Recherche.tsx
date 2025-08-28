import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import RechercheAvancee from '@/components/common/RechercheAvancee';
import BadgeRisque from '@/components/common/BadgeRisque';
import JaugeScore from '@/components/common/JaugeScore';
import { FiltreRecherche, Employeur } from '@/types';
import { searchService } from '@/services/searchService';
import { Eye } from 'lucide-react';

const Recherche: React.FC = () => {
  const [resultats, setResultats] = useState<Employeur[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = useCallback(async (filtres: FiltreRecherche) => {
    setLoading(true);
    try {
      const results = searchService.searchWithFilters(filtres);
      setResultats(results);
    } catch (error) {
      console.error('Erreur de recherche:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Recherche d'Employeurs</h1>
        <p className="text-muted-foreground">
          Recherchez et filtrez les employeurs avec la recherche floue intelligente
        </p>
      </div>

      <RechercheAvancee onSearch={handleSearch} />

      <div className="space-y-4">
        {resultats.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {resultats.length} résultat(s) trouvé(s)
          </div>
        )}

        {resultats.map((employeur) => (
          <Card key={employeur.id} className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">{employeur.nom}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Secteur:</span>
                      <div>{employeur.secteur}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Région:</span>
                      <div>{employeur.region}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Statut:</span>
                      <div>{employeur.statut}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Effectifs:</span>
                      <div>CNPS: {employeur.cnps.effectifDeclare} | Impôts: {employeur.impots.effectifDeclare}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <BadgeRisque niveau={employeur.niveauRisque} showScore score={employeur.scoreRisque} />
                    <JaugeScore score={employeur.scoreRisque} size="sm" showLabel={false} className="mt-2 w-24" />
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/employeurs/${employeur.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      Détails
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Recherche;