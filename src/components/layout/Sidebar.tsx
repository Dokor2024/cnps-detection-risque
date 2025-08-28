import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Map,
  FileText,
  Users,
  Settings,
  LogOut,
  Shield
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { authService } from '@/services/authService';
import { cn } from '@/lib/utils';

const navigation = [
  {
    title: 'Tableau de bord',
    url: '/dashboard',
    icon: LayoutDashboard,
    badge: null
  },
  {
    title: 'Recherche',
    url: '/recherche',
    icon: Search,
    badge: null
  },
  {
    title: 'Cartographie',
    url: '/carte',
    icon: Map,
    badge: null
  },
  {
    title: 'Rapports',
    url: '/rapports',
    icon: FileText,
    badge: 'IA'
  }
];

const adminNavigation = [
  {
    title: 'Utilisateurs',
    url: '/admin/users',
    icon: Users,
    roles: ['Admin']
  },
  {
    title: 'Configuration',
    url: '/admin/config',
    icon: Settings,
    roles: ['Admin', 'Contrôleur']
  }
];

export function AppSidebar() {
  const location = useLocation();
  const currentUser = authService.getCurrentUser();

  const isActive = (path: string) => location.pathname === path;
  
  const getNavCls = (path: string) =>
    isActive(path) 
      ? 'bg-primary/10 text-primary font-medium border-r-2 border-primary' 
      : 'hover:bg-accent/50 transition-colors';

  const handleLogout = () => {
    authService.logout();
    window.location.href = '/login';
  };

  if (!currentUser) {
    return null;
  }

  return (
    <Sidebar className="w-64">
      <SidebarContent>
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-lg gradient-text">
                CNPS Risk
              </h2>
              <p className="text-xs text-muted-foreground">
                Analyse de risque
              </p>
            </div>
          </div>
        </div>

        {/* Navigation principale */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) => cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                        isActive 
                          ? 'bg-primary/10 text-primary font-medium' 
                          : 'hover:bg-accent/50'
                      )}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <div className="flex items-center justify-between w-full">
                        <span>{item.title}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Navigation admin */}
        {(currentUser.role === 'Admin' || currentUser.role === 'Contrôleur') && (
          <>
            <Separator className="mx-4" />
            <SidebarGroup>
              <SidebarGroupLabel>Administration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminNavigation
                    .filter(item => {
                      if (currentUser.role === 'Admin') return true;
                      if (currentUser.role === 'Contrôleur') return item.roles.includes('Contrôleur');
                      return false;
                    })
                    .map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className={({ isActive }) => cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                            isActive 
                              ? 'bg-primary/10 text-primary font-medium' 
                              : 'hover:bg-accent/50'
                          )}
                        >
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Profil utilisateur et déconnexion */}
        <div className="mt-auto p-4 border-t">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {currentUser.name.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {currentUser.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {currentUser.role}
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            <span className="ml-2">Déconnexion</span>
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}