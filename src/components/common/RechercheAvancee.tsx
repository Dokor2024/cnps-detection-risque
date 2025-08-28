import React, { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { Search, Filter, X, Calendar as CalendarIcon } from 'lucide-react';
import { FiltreRecherche } from '@/types';
import { secteurs, regions } from '@/data/mockData';
import { searchService } from '@/services/searchService';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface RechercheAvanceeProps {
  onSearch: (filtres: FiltreRecherche) => void;
  className?: string;
}

const RechercheAvancee: React.FC<RechercheAvanceeProps> = ({ 
  onSearch, 
  className 
}) => {
  const [terme, setTerme] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filtres, setFiltres] = useState<FiltreRecherche>({});
  const [showFilters, setShowFilters] = useState(false);

  const debouncedTerme = useDebounce(terme, 300);

  // Gestion des suggestions en temps réel
  useEffect(() => {
    if (debouncedTerme.length >= 2) {
      const newSuggestions = searchService.getSuggestions(debouncedTerme);
      setSuggestions(newSuggestions);
      setShowSuggestions(newSuggestions.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedTerme]);

  // Déclencher la recherche quand les filtres changent
  useEffect(() => {
    const filtresAvecTerme = { ...filtres, terme: debouncedTerme };
    onSearch(filtresAvecTerme);
  }, [debouncedTerme, filtres, onSearch]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setTerme(suggestion);
    setShowSuggestions(false);
  }, []);

  const addFilter = useCallback((key: keyof FiltreRecherche, value: any) => {
    setFiltres(prev => {
      const current = prev[key] as any[];
      if (Array.isArray(current)) {
        if (current.includes(value)) {
          return { ...prev, [key]: current.filter(v => v !== value) };
        } else {
          return { ...prev, [key]: [...current, value] };
        }
      } else {
        return { ...prev, [key]: [value] };
      }
    });
  }, []);

  const removeFilter = useCallback((key: keyof FiltreRecherche, value?: any) => {
    setFiltres(prev => {
      if (value !== undefined) {
        const current = prev[key] as any[];
        return { ...prev, [key]: current?.filter(v => v !== value) || [] };
      } else {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFiltres({});
    setTerme('');
  }, []);

  const getActiveFiltersCount = () => {
    return Object.values(filtres).reduce((count, value) => {
      if (Array.isArray(value)) return count + value.length;
      if (value !== undefined && value !== null) return count + 1;
      return count;
    }, 0) + (terme ? 1 : 0);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Barre de recherche principale */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Rechercher un employeur (ex: Entreprise ABC)..."
            value={terme}
            onChange={(e) => setTerme(e.target.value)}
            className="pl-10 pr-20"
            onFocus={() => setShowSuggestions(suggestions.length > 0)}
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'h-8 px-2',
                showFilters && 'bg-primary/10 text-primary'
              )}
            >
              <Filter className="h-3 w-3 mr-1" />
              Filtres
              {getActiveFiltersCount() > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs">
                  {getActiveFiltersCount()}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Suggestions de recherche */}
        {showSuggestions && (
          <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg">
            <div className="py-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground text-sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <Search className="inline h-3 w-3 mr-2 text-muted-foreground" />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Panneau de filtres avancés */}
      {showFilters && (
        <div className="glass-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Filtres avancés</h3>
            {getActiveFiltersCount() > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-8 px-2 text-muted-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Effacer
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtre par secteur */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Secteur</label>
              <Select onValueChange={(value) => addFilter('secteurs', value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {secteurs.map(secteur => (
                    <SelectItem key={secteur.id} value={secteur.nom}>
                      {secteur.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtre par région */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Région</label>
              <Select onValueChange={(value) => addFilter('regions', value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {regions.map(region => (
                    <SelectItem key={region.id} value={region.nom}>
                      {region.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtre par statut */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Statut</label>
              <Select onValueChange={(value) => addFilter('statuts', value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Actif">Actif</SelectItem>
                  <SelectItem value="Inactif">Inactif</SelectItem>
                  <SelectItem value="Suspendu">Suspendu</SelectItem>
                  <SelectItem value="En contrôle">En contrôle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtre par niveau de risque */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Niveau de risque</label>
              <Select onValueChange={(value) => addFilter('niveauxRisque', value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Faible">Faible</SelectItem>
                  <SelectItem value="Moyen">Moyen</SelectItem>
                  <SelectItem value="Élevé">Élevé</SelectItem>
                  <SelectItem value="Critique">Critique</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filtres actifs */}
          {getActiveFiltersCount() > 0 && (
            <>
              <Separator />
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">Filtres actifs:</div>
                <div className="flex flex-wrap gap-2">
                  {terme && (
                    <Badge variant="secondary" className="text-xs">
                      Recherche: "{terme}"
                      <button
                        onClick={() => setTerme('')}
                        className="ml-1 hover:bg-destructive/20 rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  
                  {filtres.secteurs?.map(secteur => (
                    <Badge key={secteur} variant="secondary" className="text-xs">
                      Secteur: {secteur}
                      <button
                        onClick={() => removeFilter('secteurs', secteur)}
                        className="ml-1 hover:bg-destructive/20 rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}

                  {filtres.regions?.map(region => (
                    <Badge key={region} variant="secondary" className="text-xs">
                      Région: {region}
                      <button
                        onClick={() => removeFilter('regions', region)}
                        className="ml-1 hover:bg-destructive/20 rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}

                  {filtres.statuts?.map(statut => (
                    <Badge key={statut} variant="secondary" className="text-xs">
                      Statut: {statut}
                      <button
                        onClick={() => removeFilter('statuts', statut)}
                        className="ml-1 hover:bg-destructive/20 rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}

                  {filtres.niveauxRisque?.map(niveau => (
                    <Badge key={niveau} variant="secondary" className="text-xs">
                      Risque: {niveau}
                      <button
                        onClick={() => removeFilter('niveauxRisque', niveau)}
                        className="ml-1 hover:bg-destructive/20 rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default RechercheAvancee;