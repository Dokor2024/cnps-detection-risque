import { User } from '../types';
import { users } from '../data/mockData';

class AuthService {
  private currentUser: User | null = null;
  private storageKey = 'current_user';

  constructor() {
    // Charger l'utilisateur depuis le localStorage au démarrage
    const storedUser = localStorage.getItem(this.storageKey);
    if (storedUser) {
      try {
        this.currentUser = JSON.parse(storedUser);
      } catch (error) {
        console.error('Erreur lors du parsing de l\'utilisateur:', error);
        localStorage.removeItem(this.storageKey);
      }
    }
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    // Simulation d'un délai de réseau
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Trouver l'utilisateur par email (simulation)
    const user = users.find(u => u.email === email);
    
    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Simulation de vérification de mot de passe
    if (password.length < 3) {
      throw new Error('Mot de passe incorrect');
    }

    // Générer un token fictif
    const token = btoa(`${user.id}_${Date.now()}`);

    this.currentUser = user;
    localStorage.setItem(this.storageKey, JSON.stringify(user));

    return { user, token };
  }

  async register(email: string, password: string, name: string, role: User['role'] = 'Analyste'): Promise<{ user: User; token: string }> {
    // Simulation d'un délai de réseau
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Vérifier si l'utilisateur existe déjà
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      throw new Error('Un utilisateur avec cet email existe déjà');
    }

    // Créer un nouvel utilisateur
    const newUser: User = {
      id: (users.length + 1).toString(),
      email,
      name,
      role,
      createdAt: new Date()
    };

    // L'ajouter à la liste (en production, ceci serait envoyé au serveur)
    users.push(newUser);

    const token = btoa(`${newUser.id}_${Date.now()}`);

    this.currentUser = newUser;
    localStorage.setItem(this.storageKey, JSON.stringify(newUser));

    return { user: newUser, token };
  }

  async forgotPassword(email: string): Promise<void> {
    // Simulation d'un délai de réseau
    await new Promise(resolve => setTimeout(resolve, 800));

    const user = users.find(u => u.email === email);
    if (!user) {
      throw new Error('Aucun utilisateur trouvé avec cet email');
    }

    // En production, ceci enverrait un email de réinitialisation
    console.log(`Email de réinitialisation envoyé à ${email}`);
  }

  logout(): void {
    this.currentUser = null;
    localStorage.removeItem(this.storageKey);
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  hasRole(role: User['role']): boolean {
    return this.currentUser?.role === role;
  }

  hasAnyRole(roles: User['role'][]): boolean {
    return this.currentUser ? roles.includes(this.currentUser.role) : false;
  }

  canAccess(requiredRoles?: User['role'][]): boolean {
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    return this.hasAnyRole(requiredRoles);
  }
}

export const authService = new AuthService();