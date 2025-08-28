import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, Eye, EyeOff } from 'lucide-react';
import { authService } from '@/services/authService';
import { toast } from 'react-toastify';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { user } = await authService.login(formData.email, formData.password);
      toast.success(`Connexion réussie ! Bienvenue ${user.name}`);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion');
      toast.error(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // Comptes de démo
  const demoAccounts = [
    { email: 'admin@cnps.ci', password: 'admin123', role: 'Admin' },
    { email: 'analyste@cnps.ci', password: 'analyste123', role: 'Analyste' },
    { email: 'controleur@cnps.ci', password: 'controleur123', role: 'Contrôleur' }
  ];

  const fillDemoAccount = (account: typeof demoAccounts[0]) => {
    setFormData({
      email: account.email,
      password: account.password
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo et titre */}
        <div className="text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold gradient-text">
              CNPS Risk
            </h1>
            <p className="text-muted-foreground mt-2">
              Système d'Analyse de Risque des Employeurs
            </p>
          </div>
        </div>

        {/* Formulaire de connexion */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Connexion</CardTitle>
            <CardDescription>
              Connectez-vous à votre compte pour accéder au tableau de bord
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Adresse email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="votre.email@cnps.ci"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Votre mot de passe"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  'Se connecter'
                )}
              </Button>

              <div className="text-center space-y-2">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Mot de passe oublié ?
                </Link>
                
                <div className="text-sm text-muted-foreground">
                  Pas encore de compte ?{' '}
                  <Link to="/register" className="text-primary hover:underline">
                    S'inscrire
                  </Link>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Comptes de démonstration */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm">Comptes de démonstration</CardTitle>
            <CardDescription className="text-xs">
              Cliquez pour remplir automatiquement les champs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {demoAccounts.map((account, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                className="w-full justify-between text-xs"
                onClick={() => fillDemoAccount(account)}
                type="button"
              >
                <span>{account.role}</span>
                <span className="text-muted-foreground">{account.email}</span>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;