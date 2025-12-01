import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, MapPin, MessageSquare, Plane, Palmtree, Mountain, Calendar, Clock, Users, Plus, User, LogIn, MoreVertical, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { tripService, type Trip } from "@/services/tripService";
import { authService } from "@/services/authService";
import { useAIConfig } from "@/config/aiConfig";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import LoginModal from "@/components/LoginModal";
import DeleteTripDialog from "@/components/trip/DeleteTripDialog";
import TripStatusBadge from "@/components/trip/TripStatusBadge";
import { TripStatusType } from "@/types/tripStatus";
import { toast } from "sonner";
import heroBg from "@/assets/hero-bg.jpg";
import { useLanguage, LanguageSwitcher } from "@/hooks/useLanguage";

import { UserMenu } from "@/components/UserMenu";

const Index = () => {
  const [input, setInput] = useState("");
  const [myTrips, setMyTrips] = useState<Trip[]>([]);
  const [showMyTrips, setShowMyTrips] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const dateLocale = language === 'th' ? 'th-TH' : 'en-US';

  // Get AI config from context
  const { config: aiConfig, updateProvider, updateModel, getAvailableModels } = useAIConfig();

  // Handle profile update (refresh user data)
  const handleProfileUpdated = async () => {
     const currentUser = await authService.getCurrentUser();
     setUser(currentUser);
  };

  // Compute display name (moved from old code to fix ReferenceError)
  const displayName = user?.user_metadata?.display_name || user?.email || (language === 'th' ? 'ผู้ใช้' : 'Traveler');

  const quickActions = [
    { icon: MapPin, text: t('quickActions.findPlaces'), color: "bg-cyan-500" },
    { icon: Plane, text: t('quickActions.planTrip'), color: "bg-teal-500" },
    { icon: Palmtree, text: t('quickActions.beachTrip'), color: "bg-cyan-600" },
    { icon: Mountain, text: t('quickActions.mountainAdventure'), color: "bg-teal-600" },
  ];

  const examplePrompts = [
    t('examplePrompts.bangkokChiangMai'),
    t('examplePrompts.phuketBudget'),
    t('examplePrompts.japanRomantic'),
    t('examplePrompts.koreaFamily'),
  ];

  const handleStartPlanning = () => {
    if (input.trim()) {
      navigate(`/${language}/chat`, { state: { initialMessage: input } });
    } else {
      navigate(`/${language}/chat`);
    }
  };

  const handleQuickAction = (text: string) => {
    setInput(text);
  };

  const handleExamplePrompt = (prompt: string) => {
    navigate(`/${language}/chat`, { state: { initialMessage: prompt } });
  };

  // Check authentication status and load user trips
  useEffect(() => {
    const checkAuthAndLoadTrips = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setIsAuthenticated(true);
          setUser(currentUser);
          
          // Load user trips only if authenticated
          setLoading(true);
          const trips = await tripService.getUserTrips();
          setMyTrips(trips);
        } else {
          setIsAuthenticated(false);
          setUser(null);
          setMyTrips([]);
        }
      } catch (error) {
        console.error('Error checking auth or loading trips:', error);
        setIsAuthenticated(false);
        setUser(null);
        setMyTrips([]);
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndLoadTrips();
  }, []);

  const handleViewTrip = (tripId: string) => {
    navigate(`/${language}/trip/${tripId}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, trip: Trip) => {
    e.stopPropagation();
    setTripToDelete(trip);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tripToDelete) return;
    
    setIsDeleting(true);
    try {
      await tripService.deleteTrip(tripToDelete.id);
      setMyTrips(prev => prev.filter(t => t.id !== tripToDelete.id));
      toast.success(t('trip.deleteSuccess'));
      setDeleteDialogOpen(false);
      setTripToDelete(null);
    } catch (error) {
      console.error('Delete trip error:', error);
      toast.error(t('trip.deleteError'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setTripToDelete(null);
  };

  const handleLogin = () => {
    // Show login modal instead of redirecting
    setShowLoginModal(true);
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      setIsAuthenticated(false);
      setUser(null);
      setMyTrips([]);
      window.location.reload();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Handle login success
  const handleLoginSuccess = () => {
    console.log('🎉 Login successful! Refreshing page...');
    setShowLoginModal(false);
    // Refresh the page to update the UI
    window.location.reload();
  };


  // Handle skip login
  const handleSkipLogin = () => {
    console.log('⏭️ Skipping login, continuing as guest...');
    setShowLoginModal(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section 
        className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-overlay/70 via-overlay/50 to-overlay/70" />
        
        {/* Header with Avatar */}
        <div className="absolute top-0 left-0 right-0 z-20 p-4">
          <div className="container mx-auto flex justify-between items-center">
            {/* Logo/Brand */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center overflow-hidden border border-white/20">
                <img 
                  src="/TripsterIcon.png" 
                  alt="Tripster Logo" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Tripster
              </h1>
            </div>

            {/* User Avatar/Login Button */}
            <div className="flex items-center gap-3">
              <div className="hidden md:block">
                <LanguageSwitcher />
              </div>
              
              {isAuthenticated ? (
                <UserMenu 
                  user={user} 
                  onSignOut={handleSignOut} 
                  onUpdateProfile={handleProfileUpdated} 
                />
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogin}
                  className="text-white hover:bg-white/10 flex items-center gap-2"
                >
                  <LogIn className="w-4 h-4" />
                  {t('auth.login')}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-20">
          <div className="max-w-4xl mx-auto text-center">

            {/* Headline */}
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              {isAuthenticated ? (
                <>
                    {language === 'th'
                      ? `สวัสดี ${displayName} วันนี้เราจะไปไหนกันดี?`
                      : `Hello ${displayName}, where should we go today?`}
                </>
              ) : (
                <>
                  {language === 'th' ? 'สวัสดี ฉันชื่อ Tripster' : "Hello, I'm Tripster"}
                  <br />
                  <span className="bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
                    {t('app.subtitle')}
                  </span>
                </>
              )}
            </h2>

            <p className="text-xl text-white/90 mb-12 max-w-2xl mx-auto">
              {t('hero.description')}
            </p>

            {/* Search Box */}
            <Card className="p-2 bg-background/95 backdrop-blur-lg shadow-2xl border-white/20 max-w-3xl mx-auto mb-8">
              <div className="space-y-3">
                {/* AI Model Selection */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label htmlFor="ai-provider" className="text-xs text-gray-900 dark:text-white/80 mb-1 block">AI Model</Label>
                    <div className="flex gap-2">
                      <Select
                        value={aiConfig.currentProvider}
                        onValueChange={(value: 'openai' | 'claude' | 'gemini') => updateProvider(value)}
                      >
                        <SelectTrigger className="h-9 text-xs bg-white/95 border-white/20 text-gray-900">
                          <SelectValue placeholder="Select Provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="openai">OpenAI</SelectItem>
                          <SelectItem value="claude">Claude</SelectItem>
                          <SelectItem value="gemini">Gemini</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={aiConfig.currentModel}
                        onValueChange={(value) => updateModel(value)}
                      >
                        <SelectTrigger className="h-9 text-xs bg-white/95 border-white/20 text-gray-900">
                          <SelectValue placeholder="Select Model" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableModels().map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                {/* Input Box */}
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('chat.placeholder')}
                  className="flex-1 border-0 bg-transparent text-base h-14 px-6"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleStartPlanning();
                  }}
                />
                <Button
                  onClick={handleStartPlanning}
                  variant="hero"
                  size="lg"
                  className="h-14 px-8"
                >
                  <MessageSquare className="w-5 h-5 mr-2" />
                  {t('hero.start')}
                </Button>
                </div>
              </div>
            </Card>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-3 justify-center mb-12">
              {quickActions.map((action, idx) => (
                <Button
                  key={idx}
                  variant="glass"
                  size="lg"
                  onClick={() => handleQuickAction(action.text)}
                  className="text-white hover:scale-105 transition-transform"
                >
                  <action.icon className="w-5 h-5 mr-2" />
                  {action.text}
                </Button>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="backdrop-blur-md bg-white/10 rounded-xl p-4 border border-white/20">
                <div className="text-3xl font-bold text-white mb-1">77</div>
                <div className="text-sm text-white/80">{t('stats.provinces')}</div>
              </div>
              <div className="backdrop-blur-md bg-white/10 rounded-xl p-4 border border-white/20">
                <div className="text-3xl font-bold text-white mb-1">AI ⚡</div>
                <div className="text-sm text-white/80">{t('stats.speed')}</div>
              </div>
              <div className="backdrop-blur-md bg-white/10 rounded-xl p-4 border border-white/20 col-span-2 md:col-span-1">
                <div className="text-3xl font-bold text-white mb-1">100%</div>
                <div className="text-sm text-white/80">{t('stats.custom')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white/50 rounded-full flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-white/50 rounded-full animate-pulse" />
          </div>
        </div>
        <div className="md:hidden absolute top-16 right-4 z-20">
          <LanguageSwitcher />
        </div>
      </section>

      {/* My Trips Section - Only show if authenticated */}
      {isAuthenticated && (
        <section className="py-16 bg-gradient-to-b from-secondary to-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
                  <img
                    src={user.user_metadata.avatar_url || user.user_metadata.picture}
                    alt="Profile"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-teal-400 flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                )}
                <div className="text-left">
                  <h2 className="text-3xl md:text-4xl font-bold">
                    {t('myTrips.sectionTitle')}
                  </h2>
                  <p className="text-muted-foreground text-lg">
                    {language === 'th'
                      ? `${t('myTrips.greeting')} ${displayName}`
                      : `${t('myTrips.greeting')} ${displayName}`}
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                {t('myTrips.sectionSubtitle')}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-8">
              {loading ? (
                <div className="col-span-full text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">{t('myTrips.loading')}</p>
                </div>
              ) : myTrips.length === 0 ? (
                <div className="col-span-full text-center py-8">
                  <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">{t('myTrips.emptyTitle')}</p>
                  <p className="text-sm text-gray-500">{t('myTrips.emptyDescription')}</p>
                  <Button 
                    onClick={() => navigate(`/${language}/chat`)}
                    className="mt-4"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('myTrips.createFirst')}
                  </Button>
                </div>
              ) : (
                myTrips.map((trip) => (
                  <Card key={trip.id} className="hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer group relative" onClick={() => handleViewTrip(trip.id)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg line-clamp-2 pr-8">{trip.title}</CardTitle>
                        <div className="flex items-center gap-2">
                          <TripStatusBadge 
                            status={(trip.status as TripStatusType) || 'planning'} 
                            size="sm"
                          />
                          {/* Actions Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => handleViewTrip(trip.id)}>
                                <Edit className="h-4 w-4 mr-2" />
                                {t('trip.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={(e) => handleDeleteClick(e as any, trip)}
                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('trip.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(trip.start_date).toLocaleDateString(dateLocale)} - {new Date(trip.end_date).toLocaleDateString(dateLocale)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>
                            {language === 'th'
                              ? `${trip.destinations.length} สถานที่`
                              : `${trip.destinations.length} places`}
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-4">
                        {t('myTrips.viewDetails')}
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="text-center">
              <Button variant="outline" size="lg" onClick={() => navigate(`/${language}/chat`)}>
                <Plus className="w-5 h-5 mr-2" />
                {t('myTrips.createNew')}
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-background to-secondary">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t('features.title')}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-16">
            <Card className="p-6 text-center hover:shadow-xl transition-all hover:-translate-y-1 border-primary/20">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t('features.card.inspiration.title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('features.card.inspiration.description')}
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-xl transition-all hover:-translate-y-1 border-teal-500/20">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mx-auto mb-4">
                <Plane className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t('features.card.flight.title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('features.card.flight.description')}
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-xl transition-all hover:-translate-y-1 border-cyan-600/20">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-600 to-cyan-700 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t('features.card.lodging.title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('features.card.lodging.description')}
              </p>
            </Card>

            <Card className="p-6 text-center hover:shadow-xl transition-all hover:-translate-y-1 border-teal-600/20">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center mx-auto mb-4">
                <Mountain className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t('features.card.itinerary.title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('features.card.itinerary.description')}
              </p>
            </Card>
          </div>

          {/* Example Prompts */}
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-center mb-8">{t('examplePrompts.title')}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {examplePrompts.map((prompt, idx) => (
                <Card
                  key={idx}
                  className="p-4 cursor-pointer hover:shadow-lg hover:border-primary transition-all group"
                  onClick={() => handleExamplePrompt(prompt)}
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                    <p className="text-sm group-hover:text-primary transition-colors">
                      {prompt}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary via-accent to-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            {t('hero.cta')}
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            {t('hero.description')}
          </p>
          <Button
            onClick={() => navigate(`/${language}/chat`)}
            variant="glass"
            size="lg"
            className="text-white text-lg px-12 h-16 hover:scale-105"
          >
            <Sparkles className="w-6 h-6 mr-2" />
            {t('hero.ctaButton')}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-card border-t">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            {t('footer.text')}
          </p>
        </div>
      </footer>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
      />

      {/* Delete Trip Dialog */}
      <DeleteTripDialog
        isOpen={deleteDialogOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        tripTitle={tripToDelete?.title || ''}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default Index;
