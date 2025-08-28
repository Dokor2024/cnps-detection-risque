import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import BadgeRisque from '@/components/common/BadgeRisque';
import JaugeScore from '@/components/common/JaugeScore';
import Timeline from '@/components/common/Timeline';
import CommentForm from '@/components/common/CommentForm';
import EvolutionChart from '@/components/common/EvolutionChart';
import { employeurs, commentaires } from '@/data/mockData';
import { authService } from '@/services/authService';
import { ArrowLeft, MapPin, Building, Calendar, AlertTriangle, CheckCircle, XCircle, Users } from 'lucide-react';
import { Commentaire } from '@/types';

const EmployeurDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const employeur = employeurs.find(e => e.id === id);
  const [commentairesEmployeur, setCommentairesEmployeur] = useState<Commentaire[]>([]);
  
  const currentUser = authService.getCurrentUser();
  const canValidate = currentUser?.role === 'Contrôleur' || currentUser?.role === 'Admin';

  useEffect(() => {
    // Charger les commentaires pour cet employeur
    const commentsForEmployer = commentaires.filter(c => c.employeurId === id);
    setCommentairesEmployeur(commentsForEmployer);
  }, [id]);

  const handleCommentAdded = (nouveauCommentaire: Commentaire) => {
    setCommentairesEmployeur(prev => [nouveauCommentaire, ...prev]);
  };

  const changerStatut = (nouveauStatut: string) => {
    // Simulation du changement de statut
    console.log(`Changement de statut pour ${employeur?.nom}: ${nouveauStatut}`);
  };

  if (!employeur) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Employeur non trouvé</h1>
          <Link to="/recherche">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à la recherche
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'Actif': return 'bg-green-100 text-green-800 border-green-200';
      case 'Suspendu': return 'bg-red-100 text-red-800 border-red-200';
      case 'En contrôle': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const ecartEffectif = Math.abs(employeur.cnps.effectifDeclare - employeur.impots.effectifDeclare);
  const pourcentageEcart = employeur.impots.effectifDeclare > 0 
    ? (ecartEffectif / employeur.impots.effectifDeclare * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <Link to="/recherche">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </Link>
          </div>
          
          <h1 className="text-3xl font-bold mb-2">{employeur.nom}</h1>
          <div className="flex items-center gap-4 flex-wrap">
            <BadgeRisque niveau={employeur.niveauRisque} showScore score={employeur.scoreRisque} />
            <Badge className={`border ${getStatutColor(employeur.statut)}`}>
              {employeur.statut}
            </Badge>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Building className="h-4 w-4" />
              <span>{employeur.secteur}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{employeur.region} • {employeur.ville}</span>
            </div>
          </div>
        </div>

        {/* Actions selon le rôle */}
        {canValidate && (
          <div className="flex items-center gap-2">
            {employeur.statut !== 'En contrôle' && (
              <Button 
                variant="outline" 
                onClick={() => changerStatut('En contrôle')}
                className="gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Marquer en contrôle
              </Button>
            )}
            {employeur.statut === 'En contrôle' && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => changerStatut('Actif')}
                  className="gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Valider
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => changerStatut('Suspendu')}
                  className="gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Suspendre
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cartes principales */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Score de Risque</CardTitle>
          </CardHeader>
          <CardContent>
            <JaugeScore score={employeur.scoreRisque} size="lg" showLabel />
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Déclarations CNPS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Statut:</span>
              <Badge variant={employeur.cnps.affilie ? "default" : "destructive"}>
                {employeur.cnps.affilie ? 'Affilié' : 'Non affilié'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Effectif:</span>
              <span className="font-medium">{employeur.cnps.effectifDeclare}</span>
            </div>
            {employeur.cnps.numeroAffiliation && (
              <div className="text-xs text-muted-foreground">
                N° {employeur.cnps.numeroAffiliation}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Déclarations Impôts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Effectif:</span>
              <span className="font-medium">{employeur.impots.effectifDeclare}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">CA:</span>
              <span className="font-medium">{employeur.impots.chiffreAffaires?.toLocaleString()} FCFA</span>
            </div>
            <div className="text-xs text-muted-foreground">
              N° {employeur.impots.numeroContribuable}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Écart Effectifs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{ecartEffectif}</div>
              <div className="text-xs text-muted-foreground">employés d'écart</div>
            </div>
            <div className="text-center">
              <Badge variant={parseFloat(pourcentageEcart) > 20 ? "destructive" : "secondary"}>
                {pourcentageEcart}%
              </Badge>
            </div>
            {parseFloat(pourcentageEcart) > 30 && (
              <div className="text-xs text-orange-600 text-center">
                ⚠️ Écart significatif
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Graphique d'évolution */}
      <EvolutionChart 
        historique={employeur.historiqueEffectifs} 
        anomalies={employeur.anomalies}
        employeurNom={employeur.nom}
      />

      {/* Anomalies détectées */}
      {employeur.anomalies && employeur.anomalies.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Anomalies Détectées
              <Badge variant="destructive">{employeur.anomalies.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {employeur.anomalies.map(anomalie => (
                <div key={anomalie.id} className="border-l-4 border-orange-500 pl-4 py-2 bg-orange-50/50 dark:bg-orange-950/20 rounded-r">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-sm">{anomalie.description}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Détectée le {new Date(anomalie.dateDetection).toLocaleDateString('fr-FR')}
                      </div>
                      {anomalie.valeurConstatee !== undefined && anomalie.valeurAttendue !== undefined && (
                        <div className="text-xs mt-1">
                          Attendu: {anomalie.valeurAttendue} • Constaté: {anomalie.valeurConstatee}
                        </div>
                      )}
                    </div>
                    <Badge variant={
                      anomalie.severite === 'Critique' ? 'destructive' :
                      anomalie.severite === 'Élevé' ? 'default' : 'secondary'
                    }>
                      {anomalie.severite}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section collaboration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Historique des Actions
                <Badge variant="outline">{commentairesEmployeur.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline commentaires={commentairesEmployeur} />
            </CardContent>
          </Card>
        </div>

        <div>
          <CommentForm 
            employeurId={employeur.id}
            onCommentAdded={handleCommentAdded}
          />
        </div>
      </div>
    </div>
  );
};

export default EmployeurDetail;