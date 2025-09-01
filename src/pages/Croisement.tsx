import React, { useState, useCallback, useMemo } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, Download, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';

interface FileData {
  name: string;
  size: number;
  data: any[];
  columns: string[];
}

interface CrossedResult {
  id: string;
  nom: string;
  cnpsPresent: boolean;
  impotPresent: boolean;
  numeroAffiliation?: string;
  numeroContribuable?: string;
  effectifCnps?: number;
  effectifImpot?: number;
  ecart?: number;
  statut: 'Conforme' | 'CNPS uniquement' | 'Impôt uniquement' | 'Écart significatif';
}

const Croisement = () => {
  const [cnpsFile, setCnpsFile] = useState<FileData | null>(null);
  const [impotFile, setImpotFile] = useState<FileData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [crossedResults, setCrossedResults] = useState<CrossedResult[]>([]);

  // Simulation de données pour le parsing CSV
  const mockCnpsData = [
    { numeroAffiliation: 'CNPS001', nomEntreprise: 'Entreprise ABC', effectif: 25 },
    { numeroAffiliation: 'CNPS002', nomEntreprise: 'Société XYZ', effectif: 12 },
    { numeroAffiliation: 'CNPS003', nomEntreprise: 'Commerce DEF', effectif: 8 },
    { numeroAffiliation: 'CNPS004', nomEntreprise: 'Industries GHI', effectif: 45 }
  ];

  const mockImpotData = [
    { numeroContribuable: 'IMP001', nomEntreprise: 'Entreprise ABC', effectifDeclare: 30 },
    { numeroContribuable: 'IMP002', nomEntreprise: 'Société 123', effectifDeclare: 15 },
    { numeroContribuable: 'IMP003', nomEntreprise: 'Commerce DEF', effectifDeclare: 8 },
    { numeroContribuable: 'IMP005', nomEntreprise: 'Boutique JKL', effectifDeclare: 6 }
  ];

  const parseCSVFile = useCallback((file: File): Promise<FileData> => {
    return new Promise((resolve) => {
      // Simulation du parsing CSV
      setTimeout(() => {
        const isImpot = file.name.toLowerCase().includes('impot');
        const mockData = isImpot ? mockImpotData : mockCnpsData;
        
        resolve({
          name: file.name,
          size: file.size,
          data: mockData,
          columns: Object.keys(mockData[0] || {})
        });
      }, 1000);
    });
  }, []);

  const handleFileUpload = async (file: File, type: 'cnps' | 'impot') => {
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Format invalide",
        description: "Veuillez sélectionner un fichier CSV",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsProcessing(true);
      const parsedData = await parseCSVFile(file);
      
      if (type === 'cnps') {
        setCnpsFile(parsedData);
      } else {
        setImpotFile(parsedData);
      }
      
      toast({
        title: "Fichier importé",
        description: `${parsedData.data.length} enregistrements trouvés`,
      });
    } catch (error) {
      toast({
        title: "Erreur d'import",
        description: "Impossible de traiter le fichier",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const crossFiles = useCallback(async () => {
    if (!cnpsFile || !impotFile) {
      toast({
        title: "Fichiers manquants",
        description: "Veuillez importer les deux fichiers avant le croisement",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    // Simulation du croisement
    const interval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    setTimeout(() => {
      const results: CrossedResult[] = [];
      const cnpsMap = new Map(cnpsFile.data.map(item => [item.nomEntreprise.toLowerCase(), item]));
      const impotMap = new Map(impotFile.data.map(item => [item.nomEntreprise.toLowerCase(), item]));
      
      // Toutes les entreprises des deux fichiers
      const allEntreprises = new Set([
        ...cnpsFile.data.map(item => item.nomEntreprise.toLowerCase()),
        ...impotFile.data.map(item => item.nomEntreprise.toLowerCase())
      ]);

      allEntreprises.forEach((nomLower, index) => {
        const cnpsData = cnpsMap.get(nomLower);
        const impotData = impotMap.get(nomLower);
        
        let statut: CrossedResult['statut'] = 'Conforme';
        let ecart = 0;

        if (cnpsData && impotData) {
          ecart = Math.abs(cnpsData.effectif - impotData.effectifDeclare);
          if (ecart > 5) {
            statut = 'Écart significatif';
          }
        } else if (cnpsData && !impotData) {
          statut = 'CNPS uniquement';
        } else if (!cnpsData && impotData) {
          statut = 'Impôt uniquement';
        }

        results.push({
          id: `cross-${index}`,
          nom: cnpsData?.nomEntreprise || impotData?.nomEntreprise || '',
          cnpsPresent: !!cnpsData,
          impotPresent: !!impotData,
          numeroAffiliation: cnpsData?.numeroAffiliation,
          numeroContribuable: impotData?.numeroContribuable,
          effectifCnps: cnpsData?.effectif,
          effectifImpot: impotData?.effectifDeclare,
          ecart,
          statut
        });
      });

      setCrossedResults(results);
      setIsProcessing(false);
      setProcessingProgress(0);
      
      toast({
        title: "Croisement terminé",
        description: `${results.length} résultats générés`,
      });
    }, 2500);
  }, [cnpsFile, impotFile]);

  const exportResults = (type: 'csv' | 'pdf') => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `croisement-cnps-impot-${timestamp}.${type}`;
    
    if (type === 'csv') {
      const headers = ['Nom', 'Statut', 'CNPS', 'Impôt', 'Effectif CNPS', 'Effectif Impôt', 'Écart'];
      const csvContent = [
        headers.join(','),
        ...crossedResults.map(result => [
          result.nom,
          result.statut,
          result.cnpsPresent ? 'Oui' : 'Non',
          result.impotPresent ? 'Oui' : 'Non',
          result.effectifCnps || '',
          result.effectifImpot || '',
          result.ecart || ''
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    }
    
    toast({
      title: "Export réussi",
      description: `Fichier ${filename} téléchargé`,
    });
  };

  const getStatutBadge = (statut: CrossedResult['statut']) => {
    const variants = {
      'Conforme': 'default',
      'CNPS uniquement': 'secondary',
      'Impôt uniquement': 'outline',
      'Écart significatif': 'destructive'
    } as const;
    
    return <Badge variant={variants[statut]}>{statut}</Badge>;
  };

  const removeFile = (type: 'cnps' | 'impot') => {
    if (type === 'cnps') {
      setCnpsFile(null);
    } else {
      setImpotFile(null);
    }
    setCrossedResults([]);
  };

  const stats = useMemo(() => {
    return {
      total: crossedResults.length,
      conformes: crossedResults.filter(r => r.statut === 'Conforme').length,
      cnpsUniquement: crossedResults.filter(r => r.statut === 'CNPS uniquement').length,
      impotUniquement: crossedResults.filter(r => r.statut === 'Impôt uniquement').length,
      ecarts: crossedResults.filter(r => r.statut === 'Écart significatif').length
    };
  }, [crossedResults]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Croisement de fichiers</h1>
        <p className="text-muted-foreground mt-2">
          Importez et croisez les données CNPS et Impôts pour identifier les écarts et anomalies
        </p>
      </div>

      {/* Upload des fichiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CNPS File */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Fichier CNPS
            </CardTitle>
            <CardDescription>
              Importez le fichier des employeurs affiliés CNPS
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!cnpsFile ? (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Sélectionnez un fichier CSV</p>
                  <p className="text-xs text-muted-foreground">
                    Format attendu: nom, numéro affiliation, effectif
                  </p>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'cnps');
                  }}
                  className="mt-4"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{cnpsFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {cnpsFile.data.length} enregistrements
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile('cnps')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Fichier CNPS importé avec succès
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Impôt File */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Fichier Impôts
            </CardTitle>
            <CardDescription>
              Importez le fichier des déclarations aux impôts
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!impotFile ? (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Sélectionnez un fichier CSV</p>
                  <p className="text-xs text-muted-foreground">
                    Format attendu: nom, numéro contribuable, effectif déclaré
                  </p>
                </div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'impot');
                  }}
                  className="mt-4"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{impotFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {impotFile.data.length} enregistrements
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile('impot')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Fichier Impôts importé avec succès
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bouton de croisement */}
      {cnpsFile && impotFile && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              {isProcessing && processingProgress > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Croisement en cours...</p>
                  <Progress value={processingProgress} className="w-full" />
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Prêt à croiser {cnpsFile.data.length} enregistrements CNPS avec {impotFile.data.length} enregistrements Impôts
                  </p>
                  <Button 
                    onClick={crossFiles} 
                    disabled={isProcessing}
                    className="w-full md:w-auto"
                  >
                    Lancer le croisement
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Résultats */}
      {crossedResults.length > 0 && (
        <div className="space-y-6">
          {/* Statistiques */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{stats.conformes}</div>
                <p className="text-xs text-muted-foreground">Conformes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{stats.cnpsUniquement}</div>
                <p className="text-xs text-muted-foreground">CNPS seul</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">{stats.impotUniquement}</div>
                <p className="text-xs text-muted-foreground">Impôt seul</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">{stats.ecarts}</div>
                <p className="text-xs text-muted-foreground">Écarts</p>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => exportResults('csv')} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exporter CSV
            </Button>
            <Button onClick={() => exportResults('pdf')} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exporter PDF
            </Button>
          </div>

          {/* Tableau des résultats */}
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">Tous ({stats.total})</TabsTrigger>
              <TabsTrigger value="cnps-only">CNPS seul ({stats.cnpsUniquement})</TabsTrigger>
              <TabsTrigger value="impot-only">Impôt seul ({stats.impotUniquement})</TabsTrigger>
              <TabsTrigger value="ecarts">Écarts ({stats.ecarts})</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom de l'entreprise</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>CNPS</TableHead>
                      <TableHead>Impôt</TableHead>
                      <TableHead>Effectif CNPS</TableHead>
                      <TableHead>Effectif Impôt</TableHead>
                      <TableHead>Écart</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {crossedResults.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">{result.nom}</TableCell>
                        <TableCell>{getStatutBadge(result.statut)}</TableCell>
                        <TableCell>
                          {result.cnpsPresent ? (
                            <Badge variant="outline" className="text-green-600">Oui</Badge>
                          ) : (
                            <Badge variant="secondary">Non</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.impotPresent ? (
                            <Badge variant="outline" className="text-green-600">Oui</Badge>
                          ) : (
                            <Badge variant="secondary">Non</Badge>
                          )}
                        </TableCell>
                        <TableCell>{result.effectifCnps || '-'}</TableCell>
                        <TableCell>{result.effectifImpot || '-'}</TableCell>
                        <TableCell>
                          {result.ecart ? (
                            <span className={result.ecart > 5 ? 'text-red-600 font-medium' : ''}>
                              {result.ecart}
                            </span>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="cnps-only">
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom de l'entreprise</TableHead>
                      <TableHead>Numéro affiliation</TableHead>
                      <TableHead>Effectif CNPS</TableHead>
                      <TableHead>Action recommandée</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {crossedResults
                      .filter(r => r.statut === 'CNPS uniquement')
                      .map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">{result.nom}</TableCell>
                        <TableCell>{result.numeroAffiliation}</TableCell>
                        <TableCell>{result.effectifCnps}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-orange-600">
                            Vérifier déclaration impôt
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="impot-only">
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom de l'entreprise</TableHead>
                      <TableHead>Numéro contribuable</TableHead>
                      <TableHead>Effectif déclaré</TableHead>
                      <TableHead>Action recommandée</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {crossedResults
                      .filter(r => r.statut === 'Impôt uniquement')
                      .map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">{result.nom}</TableCell>
                        <TableCell>{result.numeroContribuable}</TableCell>
                        <TableCell>{result.effectifImpot}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            Affiliation CNPS requise
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="ecarts">
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom de l'entreprise</TableHead>
                      <TableHead>Effectif CNPS</TableHead>
                      <TableHead>Effectif Impôt</TableHead>
                      <TableHead>Écart</TableHead>
                      <TableHead>Action recommandée</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {crossedResults
                      .filter(r => r.statut === 'Écart significatif')
                      .map((result) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">{result.nom}</TableCell>
                        <TableCell>{result.effectifCnps}</TableCell>
                        <TableCell>{result.effectifImpot}</TableCell>
                        <TableCell className="text-red-600 font-medium">
                          {result.ecart}
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            Contrôle approfondi
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default Croisement;