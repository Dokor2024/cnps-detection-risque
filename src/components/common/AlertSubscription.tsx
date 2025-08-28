import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, Smartphone, Settings, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/services/authService';

interface AlerteConfig {
  id: string;
  nom: string;
  actif: boolean;
  conditions: {
    scoreRisque?: { min?: number; max?: number };
    ecartSalarial?: number;
    secteurs?: string[];
    regions?: string[];
  };
  notifications: {
    email: boolean;
    inApp: boolean;
    frequence: 'Immédiat' | 'Quotidien' | 'Hebdomadaire';
  };
}

interface AlertSubscriptionProps {
  children: React.ReactNode;
}

const AlertSubscription: React.FC<AlertSubscriptionProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [alertes, setAlertes] = useState<AlerteConfig[]>([
    {
      id: '1',
      nom: 'Score de risque élevé',
      actif: true,
      conditions: { scoreRisque: { min: 0.8 } },
      notifications: { email: true, inApp: true, frequence: 'Immédiat' }
    },
    {
      id: '2',
      nom: 'Écart salarial important',
      actif: true,
      conditions: { ecartSalarial: 0.5 },
      notifications: { email: true, inApp: false, frequence: 'Quotidien' }
    }
  ]);

  const [nouvelleAlerte, setNouvelleAlerte] = useState<Partial<AlerteConfig>>({
    nom: '',
    actif: true,
    conditions: {},
    notifications: { email: true, inApp: true, frequence: 'Immédiat' }
  });

  const currentUser = authService.getCurrentUser();

  const toggleAlerte = (id: string) => {
    setAlertes(prev => prev.map(alerte => 
      alerte.id === id ? { ...alerte, actif: !alerte.actif } : alerte
    ));
    toast.success('Configuration d\'alerte mise à jour');
  };

  const supprimerAlerte = (id: string) => {
    setAlertes(prev => prev.filter(alerte => alerte.id !== id));
    toast.success('Alerte supprimée');
  };

  const ajouterAlerte = () => {
    if (!nouvelleAlerte.nom?.trim()) {
      toast.error('Veuillez saisir un nom pour l\'alerte');
      return;
    }

    const newId = `alerte-${Date.now()}`;
    const nouvelleAlerteComplete: AlerteConfig = {
      id: newId,
      nom: nouvelleAlerte.nom!,
      actif: nouvelleAlerte.actif || true,
      conditions: nouvelleAlerte.conditions || {},
      notifications: nouvelleAlerte.notifications || { email: true, inApp: true, frequence: 'Immédiat' }
    };

    setAlertes(prev => [...prev, nouvelleAlerteComplete]);
    setNouvelleAlerte({
      nom: '',
      actif: true,
      conditions: {},
      notifications: { email: true, inApp: true, frequence: 'Immédiat' }
    });
    toast.success('Nouvelle alerte ajoutée');
  };

  const testAlerte = (alerte: AlerteConfig) => {
    toast.success(
      `Test d'alerte: ${alerte.nom}`,
      {
        description: `Une notification de test a été envoyée selon vos préférences (${alerte.notifications.email ? 'Email' : ''}${alerte.notifications.email && alerte.notifications.inApp ? ' + ' : ''}${alerte.notifications.inApp ? 'In-App' : ''})`
      }
    );
  };

  const alertesActives = alertes.filter(a => a.actif).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Gestion des Alertes
            <Badge variant="outline" className="ml-2">
              {alertesActives} active{alertesActives > 1 ? 's' : ''}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Informations utilisateur */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Préférences de notification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>Email: {currentUser?.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <span>Notifications in-app activées</span>
              </div>
            </CardContent>
          </Card>

          {/* Alertes existantes */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Alertes configurées</h3>
            {alertes.map(alerte => (
              <Card key={alerte.id} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Switch
                          checked={alerte.actif}
                          onCheckedChange={() => toggleAlerte(alerte.id)}
                        />
                        <div>
                          <div className="font-medium text-sm">{alerte.nom}</div>
                          <div className="text-xs text-muted-foreground">
                            {alerte.notifications.frequence} • 
                            {alerte.notifications.email && ' Email'}
                            {alerte.notifications.email && alerte.notifications.inApp && ' +'}
                            {alerte.notifications.inApp && ' In-App'}
                          </div>
                        </div>
                      </div>
                      
                      {/* Conditions */}
                      <div className="text-xs text-muted-foreground ml-11">
                        {alerte.conditions.scoreRisque && (
                          <span>Score ≥ {alerte.conditions.scoreRisque.min} </span>
                        )}
                        {alerte.conditions.ecartSalarial && (
                          <span>Écart salarial ≥ {(alerte.conditions.ecartSalarial * 100).toFixed(0)}% </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => testAlerte(alerte)}
                        className="h-8 px-2"
                      >
                        Test
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => supprimerAlerte(alerte.id)}
                        className="h-8 px-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Ajouter une nouvelle alerte */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nouvelle alerte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nom" className="text-sm">Nom de l'alerte</Label>
                  <Input
                    id="nom"
                    placeholder="Ex: Nouveau risque détecté"
                    value={nouvelleAlerte.nom || ''}
                    onChange={(e) => setNouvelleAlerte(prev => ({ ...prev, nom: e.target.value }))}
                    className="h-9"
                  />
                </div>
                
                <div>
                  <Label className="text-sm">Fréquence</Label>
                  <Select 
                    value={nouvelleAlerte.notifications?.frequence || 'Immédiat'}
                    onValueChange={(value) => setNouvelleAlerte(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications!, frequence: value as any }
                    }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Immédiat">Immédiat</SelectItem>
                      <SelectItem value="Quotidien">Quotidien</SelectItem>
                      <SelectItem value="Hebdomadaire">Hebdomadaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Score de risque minimum</Label>
                  <Input
                    type="number"
                    placeholder="0.8"
                    min="0"
                    max="1"
                    step="0.1"
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        setNouvelleAlerte(prev => ({
                          ...prev,
                          conditions: { ...prev.conditions, scoreRisque: { min: value } }
                        }));
                      }
                    }}
                    className="h-9"
                  />
                </div>
                
                <div>
                  <Label className="text-sm">Écart salarial minimum (%)</Label>
                  <Input
                    type="number"
                    placeholder="50"
                    min="0"
                    max="100"
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        setNouvelleAlerte(prev => ({
                          ...prev,
                          conditions: { ...prev.conditions, ecartSalarial: value / 100 }
                        }));
                      }
                    }}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={nouvelleAlerte.notifications?.email || true}
                    onCheckedChange={(checked) => setNouvelleAlerte(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications!, email: checked }
                    }))}
                  />
                  <Label className="text-sm">Notification email</Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={nouvelleAlerte.notifications?.inApp || true}
                    onCheckedChange={(checked) => setNouvelleAlerte(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications!, inApp: checked }
                    }))}
                  />
                  <Label className="text-sm">Notification in-app</Label>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={ajouterAlerte} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter l'alerte
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AlertSubscription;