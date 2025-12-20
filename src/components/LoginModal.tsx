// Login Modal - Guest to Owner Migration
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Mail, Lock, MapPin, CheckCircle, X } from 'lucide-react';
import { authService } from '@/services/authService';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const LoginModal = ({ isOpen, onClose, onSuccess }: LoginModalProps) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setLoading(true);
      const user = await authService.signIn(email, password);
      
      if (user) {
        // Migrate guest trips to authenticated user
        const guestId = authService.getGuestId();
        await authService.migrateGuestTrips(guestId, user.id);
        authService.clearGuestId();
        
        toast.success(t('loginModal.successSignIn'));
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Sign in error:', error);
      const errorMessage = error instanceof Error ? error.message : t('loginModal.errorSignIn');
      
      // Show resend confirmation option if email not confirmed
      if (errorMessage.includes('ยืนยันอีเมล') || errorMessage.includes('verify')) {
        setShowResendConfirmation(true);
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) return;
    
    try {
      setLoading(true);
      await authService.resendConfirmation(email);
      toast.success(t('loginModal.successResend'));
      setShowResendConfirmation(false);
    } catch (error) {
      console.error('Resend confirmation error:', error);
      const errorMessage = error instanceof Error ? error.message : t('loginModal.errorResend');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) return;

    try {
      setLoading(true);
      const user = await authService.signUp(email, password, displayName);
      
      if (user) {
        // Migrate guest trips to new user
        const guestId = authService.getGuestId();
        await authService.migrateGuestTrips(guestId, user.id);
        authService.clearGuestId();
        
        toast.success(t('loginModal.successSignUp'));
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Sign up error:', error);
      toast.error(t('loginModal.errorSignUp'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await authService.signInWithGoogle();
      // Google OAuth will redirect, so we don't need to handle success here
    } catch (error) {
      console.error('Google Sign In error:', error);
      const errorMessage = error instanceof Error ? error.message : t('loginModal.errorGoogle');
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <Card 
        className="w-full max-w-md mx-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('loginModal.title')}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full hover:bg-gray-100"
              aria-label={t('loginModal.close')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">{t('loginModal.tabSignIn')}</TabsTrigger>
              <TabsTrigger value="signup">{t('loginModal.tabSignUp')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">{t('loginModal.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password">{t('loginModal.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder={t('loginModal.passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('loginModal.signInLoading') : t('loginModal.signInButton')}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">{t('loginModal.or')}</span>
                  </div>
                </div>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {loading ? t('loginModal.signInLoading') : t('loginModal.googleSignIn')}
                </Button>
                
                {showResendConfirmation && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 mb-2">
                      {t('loginModal.confirmEmail')}
                    </p>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={handleResendConfirmation}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? t('loginModal.resendLoading') : t('loginModal.resendConfirmation')}
                    </Button>
                  </div>
                )}
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">{t('loginModal.displayName')}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder={t('loginModal.displayNamePlaceholder')}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t('loginModal.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t('loginModal.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder={t('loginModal.passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('loginModal.signUpLoading') : t('loginModal.signUpButton')}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-muted-foreground">{t('loginModal.or')}</span>
                  </div>
                </div>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {loading ? t('loginModal.signUpLoading') : t('loginModal.googleSignUp')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">{t('loginModal.migrationNotice')}</p>
                <p className="text-blue-600">{t('loginModal.migrationDetail')}</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              {t('loginModal.skip')}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => window.location.reload()}>
              {t('loginModal.refresh')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginModal;
