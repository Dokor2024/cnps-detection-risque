import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BadgeRisqueProps {
  niveau: 'Faible' | 'Moyen' | 'Élevé' | 'Critique';
  score?: number;
  className?: string;
  showScore?: boolean;
}

const BadgeRisque: React.FC<BadgeRisqueProps> = ({ 
  niveau, 
  score, 
  className,
  showScore = false 
}) => {
  const getVariantClass = (niveau: string) => {
    switch (niveau) {
      case 'Faible':
        return 'risk-badge-low border';
      case 'Moyen':
        return 'risk-badge-medium border';
      case 'Élevé':
        return 'risk-badge-high border';
      case 'Critique':
        return 'risk-badge-critical border';
      default:
        return 'risk-badge-low border';
    }
  };

  const getIcon = (niveau: string) => {
    switch (niveau) {
      case 'Faible':
        return '●';
      case 'Moyen':
        return '▲';
      case 'Élevé':
        return '⬆';
      case 'Critique':
        return '🔴';
      default:
        return '●';
    }
  };

  return (
    <Badge 
      className={cn(
        getVariantClass(niveau),
        'font-medium px-3 py-1 text-xs',
        className
      )}
      variant="outline"
    >
      <span className="mr-1">{getIcon(niveau)}</span>
      {niveau}
      {showScore && score !== undefined && (
        <span className="ml-1 font-mono">
          ({Math.round(score * 100)}%)
        </span>
      )}
    </Badge>
  );
};

export default BadgeRisque;