import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Commentaire } from '@/types';
import { MessageCircle, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TimelineProps {
  commentaires: Commentaire[];
  className?: string;
}

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'Contrôle':
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    case 'Validation':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'Alerte':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <MessageCircle className="h-4 w-4 text-blue-500" />;
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'Contrôle':
      return 'bg-orange-500';
    case 'Validation':
      return 'bg-green-500';
    case 'Alerte':
      return 'bg-red-500';
    default:
      return 'bg-blue-500';
  }
};

const Timeline: React.FC<TimelineProps> = ({ commentaires, className = '' }) => {
  if (!commentaires?.length) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Aucun commentaire pour le moment</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {commentaires.map((commentaire, index) => (
        <div key={commentaire.id} className="relative">
          {/* Ligne de connexion */}
          {index < commentaires.length - 1 && (
            <div className="absolute left-4 top-12 bottom-0 w-0.5 bg-border" />
          )}
          
          <div className="flex gap-4">
            {/* Avatar et icône */}
            <div className="relative flex-shrink-0">
              <div className={`absolute -top-1 -right-1 h-6 w-6 rounded-full ${getTypeColor(commentaire.type)} flex items-center justify-center z-10`}>
                {getTypeIcon(commentaire.type)}
              </div>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {commentaire.utilisateur.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Contenu */}
            <Card className="flex-1 glass-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{commentaire.utilisateur.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {commentaire.utilisateur.role}
                      </Badge>
                      {commentaire.statut && (
                        <Badge variant="secondary" className="text-xs">
                          {commentaire.statut}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(commentaire.createdAt, 'PPp', { locale: fr })}
                      <Separator orientation="vertical" className="h-3" />
                      <Badge variant="outline" className="text-xs">
                        {commentaire.type}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="text-sm leading-relaxed">
                  {commentaire.contenu}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Timeline;