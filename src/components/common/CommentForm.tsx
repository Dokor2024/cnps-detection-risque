import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send } from 'lucide-react';
import { authService } from '@/services/authService';
import { toast } from 'sonner';

interface CommentFormProps {
  employeurId: string;
  onCommentAdded?: (comment: any) => void;
  className?: string;
}

const CommentForm: React.FC<CommentFormProps> = ({ 
  employeurId, 
  onCommentAdded, 
  className = '' 
}) => {
  const [contenu, setContenu] = useState('');
  const [type, setType] = useState<string>('Commentaire');
  const [statut, setStatut] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUser = authService.getCurrentUser();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contenu.trim()) {
      toast.error('Veuillez saisir un commentaire');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simuler l'ajout du commentaire
      const nouveauCommentaire = {
        id: `comment-${Date.now()}`,
        employeurId,
        utilisateurId: currentUser?.id || '1',
        utilisateur: currentUser || { 
          id: '1', 
          name: 'Utilisateur', 
          email: 'user@cnps.ci', 
          role: 'Analyste',
          createdAt: new Date()
        },
        contenu: contenu.trim(),
        type,
        statut: statut || undefined,
        createdAt: new Date(),
      };

      // Réinitialiser le formulaire
      setContenu('');
      setType('Commentaire');
      setStatut('');
      
      // Notifier le composant parent
      onCommentAdded?.(nouveauCommentaire);
      
      toast.success('Commentaire ajouté avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'ajout du commentaire');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canValidate = currentUser?.role === 'Contrôleur' || currentUser?.role === 'Admin';

  return (
    <Card className={`glass-card ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-4 w-4" />
          Ajouter un commentaire
          <Badge variant="outline" className="text-xs">
            {currentUser?.role}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Commentaire">Commentaire</SelectItem>
                  <SelectItem value="Contrôle">Contrôle</SelectItem>
                  {canValidate && <SelectItem value="Validation">Validation</SelectItem>}
                  <SelectItem value="Alerte">Alerte</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(type === 'Contrôle' || type === 'Validation') && (
              <div>
                <label className="text-sm font-medium mb-1 block">Statut</label>
                <Select value={statut} onValueChange={setStatut}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Sélectionner un statut" />
                  </SelectTrigger>
                  <SelectContent>
                    {type === 'Contrôle' && (
                      <>
                        <SelectItem value="À contrôler">À contrôler</SelectItem>
                        <SelectItem value="En cours">En cours</SelectItem>
                        <SelectItem value="Contrôlé">Contrôlé</SelectItem>
                      </>
                    )}
                    {type === 'Validation' && canValidate && (
                      <>
                        <SelectItem value="Validé">Validé</SelectItem>
                        <SelectItem value="Rejeté">Rejeté</SelectItem>
                        <SelectItem value="En attente">En attente</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Commentaire</label>
            <Textarea
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              placeholder="Saisissez votre commentaire..."
              className="min-h-[100px] resize-none"
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground mt-1 text-right">
              {contenu.length}/500
            </div>
          </div>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={isSubmitting || !contenu.trim()}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                'Ajout...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Ajouter
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CommentForm;