import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { Employeur } from '@/types';
import { toast } from 'sonner';

interface ExportDialogProps {
  employeurs: Employeur[];
  children: React.ReactNode;
}

const ExportDialog: React.FC<ExportDialogProps> = ({ employeurs, children }) => {
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
  const [champs, setChamps] = useState<string[]>(['nom', 'secteur', 'region', 'scoreRisque', 'niveauRisque']);
  const [isExporting, setIsExporting] = useState(false);
  const [open, setOpen] = useState(false);

  const champsDisponibles = [
    { id: 'nom', label: 'Nom' },
    { id: 'secteur', label: 'Secteur' },
    { id: 'region', label: 'Région' },
    { id: 'ville', label: 'Ville' },
    { id: 'statut', label: 'Statut' },
    { id: 'scoreRisque', label: 'Score de risque' },
    { id: 'niveauRisque', label: 'Niveau de risque' },
    { id: 'cnps.affilie', label: 'CNPS Affilié' },
    { id: 'cnps.effectifDeclare', label: 'Effectif CNPS' },
    { id: 'impots.effectifDeclare', label: 'Effectif Impôts' },
    { id: 'impots.chiffreAffaires', label: 'Chiffre d\'affaires' },
    { id: 'ecartSalarial', label: 'Écart salarial' },
  ];

  const toggleChamp = (champId: string) => {
    setChamps(prev => 
      prev.includes(champId) 
        ? prev.filter(id => id !== champId)
        : [...prev, champId]
    );
  };

  const genererCSV = (data: Employeur[]) => {
    const headers = champs.map(champ => 
      champsDisponibles.find(c => c.id === champ)?.label || champ
    );

    const rows = data.map(emp => 
      champs.map(champ => {
        switch (champ) {
          case 'nom': return emp.nom;
          case 'secteur': return emp.secteur;
          case 'region': return emp.region;
          case 'ville': return emp.ville;
          case 'statut': return emp.statut;
          case 'scoreRisque': return emp.scoreRisque.toFixed(2);
          case 'niveauRisque': return emp.niveauRisque;
          case 'cnps.affilie': return emp.cnps.affilie ? 'Oui' : 'Non';
          case 'cnps.effectifDeclare': return emp.cnps.effectifDeclare;
          case 'impots.effectifDeclare': return emp.impots.effectifDeclare;
          case 'impots.chiffreAffaires': return emp.impots.chiffreAffaires || 0;
          case 'ecartSalarial': return emp.ecartSalarial ? (emp.ecartSalarial * 100).toFixed(1) + '%' : '0%';
          default: return '';
        }
      })
    );

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csvContent;
  };

  const genererPDF = (data: Employeur[]) => {
    // Simulation de génération PDF
    const contenu = `
RAPPORT D'ANALYSE DES EMPLOYEURS
================================

Généré le: ${new Date().toLocaleDateString('fr-FR')}
Nombre d'employeurs: ${data.length}

${data.map(emp => `
${emp.nom}
---------
Secteur: ${emp.secteur}
Région: ${emp.region}
Score de risque: ${emp.scoreRisque.toFixed(2)} (${emp.niveauRisque})
Effectif CNPS: ${emp.cnps.effectifDeclare}
Effectif Impôts: ${emp.impots.effectifDeclare}
Statut: ${emp.statut}

`).join('')}

Fin du rapport
    `.trim();

    return contenu;
  };

  const handleExport = async () => {
    if (champs.length === 0) {
      toast.error('Veuillez sélectionner au moins un champ à exporter');
      return;
    }

    setIsExporting(true);
    
    try {
      let contenu: string;
      let filename: string;
      let mimeType: string;

      if (format === 'csv') {
        contenu = genererCSV(employeurs);
        filename = `employeurs_${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv;charset=utf-8;';
      } else {
        contenu = genererPDF(employeurs);
        filename = `rapport_employeurs_${new Date().toISOString().split('T')[0]}.txt`;
        mimeType = 'text/plain;charset=utf-8;';
      }

      // Créer et déclencher le téléchargement
      const blob = new Blob([contenu], { type: mimeType });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      toast.success(`Export ${format.toUpperCase()} généré avec succès`);
      setOpen(false);
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exporter les données
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Informations */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Employeurs à exporter:</span>
            <Badge variant="outline">{employeurs.length}</Badge>
          </div>

          {/* Format */}
          <div>
            <label className="text-sm font-medium mb-2 block">Format d'export</label>
            <Select value={format} onValueChange={(value) => setFormat(value as 'csv' | 'pdf')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV (Excel)
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    PDF (Rapport)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Champs à exporter */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Champs à inclure ({champs.length} sélectionné{champs.length > 1 ? 's' : ''})
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
              {champsDisponibles.map(champ => (
                <div key={champ.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={champ.id}
                    checked={champs.includes(champ.id)}
                    onCheckedChange={() => toggleChamp(champ.id)}
                  />
                  <label
                    htmlFor={champ.id}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {champ.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={isExporting || champs.length === 0}
              className="min-w-[120px]"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Export...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;