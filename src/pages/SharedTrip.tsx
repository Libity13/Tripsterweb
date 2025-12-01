// Shared Trip - Public read-only view
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MapPin, 
  Calendar, 
  Clock, 
  ArrowLeft,
  Copy,
  LogIn,
  Share2,
  Map,
  List
} from 'lucide-react';
import MapView from '@/components/trip/MapView';
import { shareService } from '@/services/shareService';
import { authService } from '@/services/authService';
import { Trip, Destination } from '@/types/database';
import { TripStatusBadge } from '@/components/trip/TripStatusBadge';
import { TripStatusType } from '@/types/tripStatus';
import LoginModal from '@/components/LoginModal';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';

const SharedTrip = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [activeTab, setActiveTab] = useState<'itinerary' | 'map'>('itinerary');
  
  const dateLocale = language === 'th' ? 'th-TH' : 'en-US';

  useEffect(() => {
    const loadTrip = async () => {
      if (!token) {
        setError('Invalid share link');
        setLoading(false);
        return;
      }

      try {
        const sharedTrip = await shareService.getTripByShareToken(token);
        if (!sharedTrip) {
          setError('Trip not found or no longer shared');
          setLoading(false);
          return;
        }
        
        // Transform to Trip type
        setTrip({
          ...sharedTrip,
          destinations: (sharedTrip.destinations || []).map((d: any) => ({
            ...d,
            name_en: d.name_en || d.name,
            description_en: d.description_en || d.description,
          })),
        });
        
        // Check if user is logged in
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
        
      } catch (err) {
        console.error('Error loading shared trip:', err);
        setError('Failed to load trip');
      } finally {
        setLoading(false);
      }
    };

    loadTrip();
  }, [token]);

  const handleCopyToAccount = async () => {
    if (!token || !user) {
      setShowLoginModal(true);
      return;
    }

    setIsCopying(true);
    try {
      const newTripId = await shareService.copySharedTrip(token, user.id);
      toast.success(language === 'th' ? 'คัดลอกแผนเรียบร้อย!' : 'Trip copied successfully!');
      navigate(`/${language}/trip/${newTripId}`);
    } catch (err) {
      console.error('Copy trip error:', err);
      toast.error(language === 'th' ? 'ไม่สามารถคัดลอกได้' : 'Failed to copy trip');
    } finally {
      setIsCopying(false);
    }
  };

  const handleLoginSuccess = async () => {
    setShowLoginModal(false);
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
    toast.success(language === 'th' ? 'เข้าสู่ระบบสำเร็จ!' : 'Logged in successfully!');
  };

  // Group destinations by day
  const destinationsByDay = trip?.destinations?.reduce((acc, dest) => {
    const day = dest.visit_date || 1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(dest);
    // Sort by order_index
    acc[day].sort((a, b) => ((a as any).order_index || 0) - ((b as any).order_index || 0));
    return acc;
  }, {} as Record<number, Destination[]>) || {};

  // Calculate trip duration
  const tripDays = trip ? 
    Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1 
    : 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Share2 className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold mb-2">
              {language === 'th' ? 'ไม่พบแผนการเดินทาง' : 'Trip not found'}
            </h1>
            <p className="text-muted-foreground mb-6">
              {language === 'th' 
                ? 'ลิงก์นี้อาจหมดอายุหรือถูกปิดการแชร์' 
                : 'This link may have expired or sharing has been disabled'}
            </p>
            <Button onClick={() => navigate(`/${language}`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {language === 'th' ? 'กลับหน้าหลัก' : 'Back to Home'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate(`/${language}`)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{trip.title}</h1>
                  <TripStatusBadge 
                    status={(trip.status as TripStatusType) || 'planning'} 
                    size="sm"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(trip.start_date).toLocaleDateString(dateLocale)}
                    {trip.end_date && ` - ${new Date(trip.end_date).toLocaleDateString(dateLocale)}`}
                  </span>
                  <span className="mx-2">•</span>
                  <MapPin className="w-4 h-4" />
                  <span>{trip.destinations?.length || 0} {language === 'th' ? 'สถานที่' : 'places'}</span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {user ? (
                <Button onClick={handleCopyToAccount} disabled={isCopying}>
                  <Copy className="w-4 h-4 mr-2" />
                  {isCopying 
                    ? (language === 'th' ? 'กำลังคัดลอก...' : 'Copying...') 
                    : t('share.copyToAccount')}
                </Button>
              ) : (
                <Button onClick={() => setShowLoginModal(true)}>
                  <LogIn className="w-4 h-4 mr-2" />
                  {t('share.loginToEdit')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tabs - Itinerary / Map */}
      <div className="container py-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'itinerary' | 'map')}>
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="itinerary">
              <List className="w-4 h-4 mr-2" />
              📋 Itinerary
            </TabsTrigger>
            <TabsTrigger value="map">
              <Map className="w-4 h-4 mr-2" />
              🗺️ Map
            </TabsTrigger>
          </TabsList>

          <TabsContent value="itinerary" className="mt-4">
            <div className="space-y-6">
              {Array.from({ length: tripDays }, (_, i) => i + 1).map(day => {
                const dayDestinations = destinationsByDay[day] || [];
                const dayDate = new Date(trip.start_date);
                dayDate.setDate(dayDate.getDate() + day - 1);

                return (
                  <Card key={day}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <span className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                          {day}
                        </span>
                        {language === 'th' ? `วันที่ ${day}` : `Day ${day}`}
                        <span className="text-sm font-normal text-muted-foreground">
                          ({dayDate.toLocaleDateString(dateLocale, { weekday: 'short', month: 'short', day: 'numeric' })})
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {dayDestinations.length === 0 ? (
                        <p className="text-muted-foreground text-sm py-4 text-center">
                          {language === 'th' ? 'ยังไม่มีกำหนดการ' : 'No plans yet'}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {dayDestinations.map((dest, idx) => (
                            <div 
                              key={dest.id} 
                              className="flex gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              {/* Index */}
                              <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                                {idx + 1}
                              </div>
                              
                              {/* Photo */}
                              {dest.photos && dest.photos[0] && (
                                <img 
                                  src={dest.photos[0]} 
                                  alt={dest.name}
                                  className="w-16 h-16 rounded-lg object-cover shrink-0"
                                />
                              )}
                              
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate">
                                  {language === 'en' && dest.name_en ? dest.name_en : dest.name}
                                </h4>
                                <p className="text-sm text-muted-foreground truncate">
                                  {dest.formatted_address || dest.description}
                                </p>
                                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                  {dest.visit_duration && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {dest.visit_duration} {language === 'th' ? 'นาที' : 'min'}
                                    </span>
                                  )}
                                  {dest.rating && dest.rating > 0 && (
                                    <span className="flex items-center gap-1">
                                      ⭐ {dest.rating.toFixed(1)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="map" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <div className="h-[600px] rounded-lg overflow-hidden">
                  <MapView
                    destinations={trip.destinations || []}
                    onDestinationClick={() => {}}
                    onDestinationReorder={() => {}}
                    language={language}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
};

export default SharedTrip;

