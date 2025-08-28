import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import BadgeRisque from '@/components/common/BadgeRisque';
import { 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  FileText 
} from 'lucide-react';
import { statistiquesDashboard } from '@/data/mockData';

const Dashboard: React.FC = () => {
  const stats = statistiquesDashboard;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Tableau de bord</h1>
        <p className="text-muted-foreground">
          Vue d'ensemble de l'analyse de risque des employeurs
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employeurs</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployeurs}</div>
            <p className="text-xs text-muted-foreground">
              Employeurs surveillés
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risque Élevé</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {stats.employeursRisqueEleve}
            </div>
            <p className="text-xs text-muted-foreground">
              Nécessitent un contrôle
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employeurs Actifs</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {stats.employeursActifs}
            </div>
            <p className="text-xs text-muted-foreground">
              En règle avec la CNPS
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nouveaux Cette Semaine</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {stats.nouveauxCetteSemaine}
            </div>
            <p className="text-xs text-muted-foreground">
              Ajouts récents
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Répartition des risques */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Répartition par Niveau de Risque</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center space-y-2">
              <BadgeRisque niveau="Faible" />
              <div className="text-2xl font-bold text-green-500">
                {stats.repartitionRisque.faible}
              </div>
            </div>
            <div className="text-center space-y-2">
              <BadgeRisque niveau="Moyen" />
              <div className="text-2xl font-bold text-yellow-500">
                {stats.repartitionRisque.moyen}
              </div>
            </div>
            <div className="text-center space-y-2">
              <BadgeRisque niveau="Élevé" />
              <div className="text-2xl font-bold text-orange-500">
                {stats.repartitionRisque.eleve}
              </div>
            </div>
            <div className="text-center space-y-2">
              <BadgeRisque niveau="Critique" />
              <div className="text-2xl font-bold text-red-500">
                {stats.repartitionRisque.critique}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;