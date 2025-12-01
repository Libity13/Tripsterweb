import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Calendar, Plus, ArrowLeft, LogIn, MoreVertical, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useLanguage, LanguageSwitcher } from "@/hooks/useLanguage";
import { UserMenu } from "@/components/UserMenu";
import LoginModal from "@/components/LoginModal";
import DeleteTripDialog from "@/components/trip/DeleteTripDialog";
import TripStatusBadge from "@/components/trip/TripStatusBadge";
import { TripStatusType } from "@/types/tripStatus";
import { toast } from "sonner";

const MyTrips = () => {
  const [myTrips, setMyTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const dateLocale = language === 'th' ? 'th-TH' : 'en-US';

  // Check authentication and load trips
  useEffect(() => {
    const checkAuthAndLoadTrips = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setIsAuthenticated(true);
          setUser(currentUser);
          
          // Load trips
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

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      setIsAuthenticated(false);
      setUser(null);
      setMyTrips([]);
      navigate(`/${language}`);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleProfileUpdated = async () => {
     const currentUser = await authService.getCurrentUser();
     setUser(currentUser);
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    window.location.reload();
  };

  const handleDeleteClick = (e: React.MouseEvent, trip: Trip) => {
    e.stopPropagation(); // Prevent card click
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

  // If not authenticated and not loading, show login prompt state
  if (!loading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <LogIn className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{t('myTrips.sectionTitle')}</h1>
          <p className="text-muted-foreground">{t('loginPrompt.description')}</p>
          <div className="flex gap-4 justify-center pt-4">
            <Button variant="outline" onClick={() => navigate(`/${language}`)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => setShowLoginModal(true)}>
              {t('auth.login')}
            </Button>
          </div>
        </div>
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSuccess={handleLoginSuccess}
        />
        <DeleteTripDialog
          isOpen={deleteDialogOpen}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          tripTitle={tripToDelete?.title || ''}
          isDeleting={isDeleting}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/${language}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">{t('myTrips.sectionTitle')}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:block">
               <LanguageSwitcher />
            </div>
            {isAuthenticated && (
              <UserMenu 
                user={user} 
                onSignOut={handleSignOut} 
                onUpdateProfile={handleProfileUpdated} 
              />
            )}
          </div>
        </div>
      </header>

      <main className="container py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('myTrips.loading')}</p>
          </div>
        ) : myTrips.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold">{t('myTrips.emptyTitle')}</h2>
            <p className="text-sm text-muted-foreground mb-6">{t('myTrips.emptyDescription')}</p>
            <Button onClick={() => navigate(`/${language}/chat`)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('myTrips.createFirst')}
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myTrips.map((trip) => (
              <Card key={trip.id} className="hover:shadow-lg transition-all cursor-pointer group relative" onClick={() => handleViewTrip(trip.id)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors pr-8">
                      {trip.title}
                    </CardTitle>
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
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {trip.description || t('app.subtitle')}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(trip.start_date).toLocaleDateString(dateLocale)} 
                        {trip.end_date && ` - ${new Date(trip.end_date).toLocaleDateString(dateLocale)}`}
                      </span>
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
                </CardContent>
              </Card>
            ))}
            
            {/* Add New Trip Card */}
            <Card 
              className="flex flex-col items-center justify-center p-6 border-2 border-dashed cursor-pointer hover:border-primary hover:bg-accent/50 transition-colors min-h-[200px]"
              onClick={() => navigate(`/${language}/chat`)}
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-1">{t('myTrips.createNew')}</h3>
              <p className="text-sm text-muted-foreground text-center">
                {t('hero.start')}
              </p>
            </Card>
          </div>
        )}
      </main>

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

export default MyTrips;

