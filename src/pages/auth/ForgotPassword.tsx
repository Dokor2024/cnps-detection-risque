import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, ArrowLeft, Mail } from 'lucide-react';
import { authService } from '@/services/authService';
import { toast } from 'react-toastify';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authService.forgotPassword(email);
      setSuccess(true);
      toast.success('Instructions de réinitialisation envoyées par email');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi de l\'email');
      toast.error(err.message || 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Email envoyé</h1>
              <p className="text-muted-foreground mt-2">
                Vérifiez votre boîte de réception
              </p>
            </div>
          </div>

          <Card className="glass-card">
            <CardContent className="pt-6 space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Nous avons envoyé les instructions de réinitialisation du mot de passe à :
              </p>
              <div className="font-mono text-sm bg-muted/20 p-3 rounded-lg">
                {email}
              </div>
              <p className="text-xs text-muted-foreground">
                Si vous ne recevez pas l'email dans les 5 minutes, vérifiez votre dossier spam ou contactez l'administrateur.
              </p>
              <Button asChild className="w-full">
                <Link to="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour à la connexion
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
              Réinitialiser votre mot de passe
            </p>
          </div>
        </div>

        {/* Formulaire de récupération */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Mot de passe oublié</CardTitle>
            <CardDescription>
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  'Envoyer les instructions'
                )}
              </Button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm text-primary hover:underline inline-flex items-center"
                >
                  <ArrowLeft className="mr-1 h-3 w-3" />
                  Retour à la connexion
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Note d'information */}
        <Card className="glass-card">
          <CardContent className="pt-4">
            <div className="text-xs text-muted-foreground space-y-2">
              <p><strong>Note :</strong> Ceci est une démonstration.</p>
              <p>En production, un vrai email serait envoyé avec un lien sécurisé de réinitialisation.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;