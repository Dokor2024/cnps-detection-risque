import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { HistoriqueEffectif, Anomalie } from '@/types';

interface EvolutionChartProps {
  historique: HistoriqueEffectif[];
  anomalies?: Anomalie[];
  employeurNom: string;
  className?: string;
}

const EvolutionChart: React.FC<EvolutionChartProps> = ({ 
  historique, 
  anomalies = [], 
  employeurNom,
  className = '' 
}) => {
  // Préparer les données pour le graphique
  const data = historique
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(item => ({
      periode: `${item.mois.toString().padStart(2, '0')}/${item.annee}`,
      moisAnnee: `${item.annee}-${item.mois.toString().padStart(2, '0')}`,
      cnps: item.effectifCnps,
      impots: item.effectifImpots,
      ecart: item.ecart,
      annee: item.annee,
      mois: item.mois
    }));

  // Identifier les périodes avec anomalies
  const periodesAnomalies = anomalies
    .filter(a => a.type === 'Effectif')
    .map(a => {
      const date = new Date(a.dateDetection);
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    });

  // Calculer les tendances
  const derniereMesure = data[data.length - 1];
  const precedenteMesure = data[data.length - 2];
  
  const tendanceCnps = derniereMesure && precedenteMesure 
    ? derniereMesure.cnps - precedenteMesure.cnps 
    : 0;
  
  const tendanceImpots = derniereMesure && precedenteMesure 
    ? derniereMesure.impots - precedenteMesure.impots 
    : 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isAnomalie = periodesAnomalies.includes(label.replace('/', '-'));
      
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium mb-2">{`Période: ${payload[0].payload.periode}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value} employés
            </p>
          ))}
          <p className="text-sm text-muted-foreground mt-1">
            Écart: {payload[0].payload.ecart} employés
          </p>
          {isAnomalie && (
            <div className="flex items-center gap-1 mt-2 text-orange-600">
              <AlertTriangle className="h-3 w-3" />
              <span className="text-xs">Anomalie détectée</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    const isAnomalie = periodesAnomalies.includes(payload.moisAnnee);
    
    if (isAnomalie) {
      return (
        <circle 
          cx={cx} 
          cy={cy} 
          r={4} 
          fill="#f97316" 
          stroke="#ea580c" 
          strokeWidth={2}
        />
      );
    }
    return null;
  };

  if (!data.length) {
    return (
      <Card className={`glass-card ${className}`}>
        <CardHeader>
          <CardTitle>Évolution des Effectifs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Aucune donnée historique disponible
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`glass-card ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Évolution des Effectifs - {employeurNom}</span>
          <div className="flex items-center gap-2">
            {tendanceCnps !== 0 && (
              <Badge variant={tendanceCnps > 0 ? "default" : "destructive"} className="text-xs">
                CNPS {tendanceCnps > 0 ? <TrendingUp className="h-3 w-3 ml-1" /> : <TrendingDown className="h-3 w-3 ml-1" />}
                {Math.abs(tendanceCnps)}
              </Badge>
            )}
            {tendanceImpots !== 0 && (
              <Badge variant={tendanceImpots > 0 ? "default" : "destructive"} className="text-xs">
                Impôts {tendanceImpots > 0 ? <TrendingUp className="h-3 w-3 ml-1" /> : <TrendingDown className="h-3 w-3 ml-1" />}
                {Math.abs(tendanceImpots)}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="periode" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {/* Ligne de référence pour les anomalies majeures */}
              {anomalies.some(a => a.severite === 'Critique') && (
                <ReferenceLine 
                  y={anomalies.find(a => a.severite === 'Critique')?.valeurAttendue || 0}
                  stroke="#ef4444" 
                  strokeDasharray="5 5"
                  label="Seuil critique"
                />
              )}
              
              <Line
                type="monotone"
                dataKey="cnps"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                name="CNPS"
                dot={<CustomDot />}
                activeDot={{ r: 4, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="impots"
                stroke="hsl(var(--secondary))"
                strokeWidth={2}
                name="Impôts"
                dot={<CustomDot />}
                activeDot={{ r: 4, stroke: "hsl(var(--secondary))", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Légende des anomalies */}
        {periodesAnomalies.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-muted-foreground">Points avec anomalies détectées</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {periodesAnomalies.length} anomalie(s)
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EvolutionChart;