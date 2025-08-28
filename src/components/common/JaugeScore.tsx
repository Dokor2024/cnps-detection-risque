import React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface JaugeScoreProps {
  score: number; // Entre 0 et 1
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const JaugeScore: React.FC<JaugeScoreProps> = ({ 
  score, 
  className,
  showLabel = true,
  size = 'md'
}) => {
  const pourcentage = Math.round(score * 100);
  
  const getColorClass = (score: number) => {
    if (score >= 0.8) return 'risk-critical';
    if (score >= 0.6) return 'risk-high';
    if (score >= 0.3) return 'risk-medium';
    return 'risk-low';
  };

  const getSizeClass = (size: string) => {
    switch (size) {
      case 'sm': return 'h-2';
      case 'lg': return 'h-4';
      default: return 'h-3';
    }
  };

  const getTextSize = (size: string) => {
    switch (size) {
      case 'sm': return 'text-xs';
      case 'lg': return 'text-base';
      default: return 'text-sm';
    }
  };

  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className="flex justify-between items-center">
          <span className={cn('font-medium text-muted-foreground', getTextSize(size))}>
            Score de risque
          </span>
          <span className={cn('font-mono font-bold', getTextSize(size))}>
            {pourcentage}%
          </span>
        </div>
      )}
      <div className="relative">
        <Progress 
          value={pourcentage} 
          className={cn(
            getSizeClass(size),
            'transition-all duration-500'
          )}
        />
        <div 
          className={cn(
            'absolute inset-0 rounded-full transition-all duration-500',
            getSizeClass(size)
          )}
          style={{
            background: `linear-gradient(to right, 
              ${score >= 0.8 ? 'hsl(var(--risk-critical))' : 
                score >= 0.6 ? 'hsl(var(--risk-high))' : 
                score >= 0.3 ? 'hsl(var(--risk-medium))' : 
                'hsl(var(--risk-low))'
              } 0%, 
              transparent ${pourcentage}%
            )`
          }}
        />
      </div>
      
      {/* Indicateurs de seuil */}
      <div className="relative h-1">
        <div className="absolute w-full flex justify-between text-xs text-muted-foreground">
          <span className="text-green-400">0%</span>
          <span className="text-yellow-400">30%</span>
          <span className="text-orange-400">60%</span>
          <span className="text-red-400">80%</span>
        </div>
        <div className="absolute w-full h-px bg-border top-0">
          <div className="absolute h-2 w-px bg-yellow-400/50" style={{ left: '30%', top: '-2px' }} />
          <div className="absolute h-2 w-px bg-orange-400/50" style={{ left: '60%', top: '-2px' }} />
          <div className="absolute h-2 w-px bg-red-400/50" style={{ left: '80%', top: '-2px' }} />
        </div>
      </div>
    </div>
  );
};

export default JaugeScore;