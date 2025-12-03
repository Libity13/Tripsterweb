// Trip Planner - Display and manage trip itinerary
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, DollarSign, Star, Navigation, Share2, Download, MessageCircle, User, X, LogIn } from 'lucide-react';
import MapView from '@/components/trip/MapView';
import ItineraryPanel from '@/components/trip/ItineraryPanel';
import ChatPanel from '@/components/trip/ChatPanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import PlaceSearch from '@/components/PlaceSearch';
import { tripService } from '@/services/tripService';
import { Trip, Destination } from '@/types/database';
import { realtimeSyncService } from '@/services/realtimeSyncService';
import { databaseSyncService } from '@/services/databaseSyncService';
import { authService } from '@/services/authService';
import { supabase } from '@/lib/unifiedSupabaseClient';
import LoginModal from '@/components/LoginModal';
import TripStatusButton from '@/components/trip/TripStatusButton';
import ShareDialog from '@/components/trip/ShareDialog';
import ExportPDFButton from '@/components/trip/ExportPDFButton';
import { TripStatusType } from '@/types/tripStatus';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

// Types are now imported from tripService

// Mobile Tabs Component
const MobileTripTabs = ({
  trip,
  selectedDay,
  viewMode,
  onDestinationsUpdate,
  onAddDestination,
  onViewModeChange,
  onSelectedDayChange
}: {
  trip: Trip;
  selectedDay: number;
  viewMode: 'grid' | 'timeline';
  onDestinationsUpdate: (destinations: Destination[]) => void;
  onAddDestination: (day: number) => void;
  onViewModeChange: (mode: 'grid' | 'timeline') => void;
  onSelectedDayChange: (day: number) => void;
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'itinerary' | 'map'>('itinerary');

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation - Fixed at bottom for mobile */}
      <div className="order-2 sm:order-1 bg-white border-t sm:border-t-0 sm:border-b sticky bottom-0 sm:static z-30">
        <div className="flex">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-3 px-2 text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5
              ${activeTab === 'chat' 
                ? 'text-primary border-t-2 sm:border-t-0 sm:border-b-2 border-primary bg-primary/5' 
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>แชท</span>
          </button>
          <button
            onClick={() => setActiveTab('itinerary')}
            className={`flex-1 py-3 px-2 text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5
              ${activeTab === 'itinerary' 
                ? 'text-primary border-t-2 sm:border-t-0 sm:border-b-2 border-primary bg-primary/5' 
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <Clock className="w-4 h-4" />
            <span>กำหนดการ</span>
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`flex-1 py-3 px-2 text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5
              ${activeTab === 'map' 
                ? 'text-primary border-t-2 sm:border-t-0 sm:border-b-2 border-primary bg-primary/5' 
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            <MapPin className="w-4 h-4" />
            <span>แผนที่</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="order-1 sm:order-2 flex-1 min-h-0 overflow-hidden">
        {activeTab === 'chat' && (
          <Card className="h-full flex flex-col overflow-hidden rounded-none sm:rounded-lg">
            <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
              <ChatPanel 
                tripId={trip?.id}
                onDestinationsUpdate={onDestinationsUpdate}
              />
            </CardContent>
          </Card>
        )}

        {activeTab === 'itinerary' && (
          <Card className="h-full flex flex-col overflow-hidden rounded-none sm:rounded-lg">
            <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
              <ItineraryPanel 
                destinations={trip.destinations}
                onUpdate={onDestinationsUpdate}
                onAddDestination={onAddDestination}
                startDate={trip.start_date}
                endDate={trip.end_date}
                viewMode={viewMode}
                onViewModeChange={onViewModeChange}
                onSelectedDayChange={onSelectedDayChange}
                tripId={trip.id}
              />
            </CardContent>
          </Card>
        )}

        {activeTab === 'map' && (
          <Card className="h-full flex flex-col overflow-hidden rounded-none sm:rounded-lg">
            <CardContent className="flex-1 min-h-0 p-0 relative">
              <div className="absolute inset-0">
                <ErrorBoundary>
                  <MapView destinations={trip.destinations} selectedDay={selectedDay} />
                </ErrorBoundary>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

const TripPlanner = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPlaceSearch, setShowPlaceSearch] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [user, setUser] = useState<any>(null);

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
        setUser(null);
      }
    };

    loadUser();
  }, []);

  // Load trip data from database or create new trip
  useEffect(() => {
    const loadTrip = async () => {
      try {
        console.log('🔍 TripPlanner: Loading trip with ID:', id);
        console.log('🔍 TripPlanner: ID type:', typeof id);
        console.log('🔍 TripPlanner: ID truthy:', !!id);
        
        if (id === 'demo') {
          console.log('🔍 TripPlanner: Creating demo trip...');
          // Create a new trip in database
          const newTrip = await tripService.createTrip({
            title: 'แผนการเดินทางใหม่',
            title_en: 'New Travel Plan',
            description: 'แผนการเดินทางที่สร้างจาก AI Chat',
            description_en: 'Travel plan created from AI Chat',
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            language: 'th'
          });
          console.log('✅ TripPlanner: Demo trip created:', newTrip);
          setTrip(newTrip);
          toast.success('สร้างแผนการเดินทางใหม่แล้ว!');
        } else {
          console.log('🔍 TripPlanner: Loading existing trip...');
          // Load existing trip from database
          // Check if id is a valid UUID format
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (uuidRegex.test(id!)) {
            console.log('✅ TripPlanner: Valid UUID format, loading trip...');
            const existingTrip = await tripService.getTrip(id!);
            console.log('🔍 TripPlanner: Trip loaded:', existingTrip);
            console.log('🔍 TripPlanner: Trip dates:', { 
              start_date: existingTrip?.start_date, 
              end_date: existingTrip?.end_date 
            });
            if (existingTrip) {
              console.log('✅ TripPlanner: Trip found, setting state...');
              setTrip(existingTrip);
            } else {
              console.error('❌ TripPlanner: Trip not found');
              toast.error('ไม่พบแผนการเดินทางนี้');
            }
          } else {
            console.error('❌ TripPlanner: Invalid UUID format:', id);
            toast.error('รูปแบบ ID ไม่ถูกต้อง');
          }
        }
      } catch (error) {
        console.error('❌ TripPlanner: Error loading trip:', error);
        console.error('❌ TripPlanner: Error details:', error.message);
        console.error('❌ TripPlanner: Error stack:', error.stack);
        toast.error('เกิดข้อผิดพลาดในการโหลดแผนการเดินทาง');
      } finally {
        console.log('🔍 TripPlanner: Setting loading to false');
        setLoading(false);
      }
    };

    loadTrip();
  }, [id]);

  // Setup real-time sync when trip is loaded
  useEffect(() => {
    if (!trip?.id) return;

    console.log('🔄 Setting up real-time sync for trip:', trip.id);
    
    const syncOptions = {
      tripId: trip.id,
      onDestinationsUpdate: (destinations: Destination[]) => {
        console.log('📱 Real-time destinations update:', destinations);
        setTrip(prev => prev ? { ...prev, destinations } : null);
      },
      onTripUpdate: (updatedTrip: Trip) => {
        console.log('📱 Real-time trip update:', updatedTrip);
        setTrip(updatedTrip);
      },
      onError: (error: any) => {
        console.error('❌ Real-time sync error:', error);
        toast.error('เกิดข้อผิดพลาดในการซิงค์ข้อมูล');
      }
    };

    realtimeSyncService.subscribeToTrip(trip.id, syncOptions);

    // Real-time sync is handled by realtimeSyncService
    // No need for force reloading

    // Cleanup on unmount
    return () => {
      console.log('🔄 Cleaning up real-time sync for trip:', trip.id);
      realtimeSyncService.unsubscribeFromTrip(trip.id);
    };
  }, [trip?.id]);

  const handleSaveTrip = async () => {
    if (!trip) return;
    
    try {
      await tripService.updateTrip(trip.id, trip);
      toast.success('บันทึกแผนการเดินทางแล้ว!');
    } catch (error) {
      console.error('Error saving trip:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    toast.success('เข้าสู่ระบบสำเร็จ! แผนการเดินทางของคุณถูกย้ายมาแล้ว');
    // Refresh the page to reload with new user context
    window.location.reload();
  };

  const handleShareTrip = () => {
    if (!user) {
      toast.error(language === 'th' ? 'กรุณาเข้าสู่ระบบก่อนแชร์' : 'Please sign in to share');
      setShowLoginModal(true);
      return;
    }
    setShowShareDialog(true);
  };

  const handleExportPDF = () => {
    setShowLoginPrompt(true);
  };

  const handleDestinationsUpdate = (destinations: Destination[]) => {
    if (!trip) return;
    
      console.log('🔄 Updating destinations:', destinations.length, 'destinations');
      
    // Update local state only (database sync handled by realtime)
    setTrip(prev => prev ? { ...prev, destinations } : null);
      
      toast.success('อัปเดตสถานที่แล้ว!');
  };

  const handleAddDestination = (day: number) => {
    setSelectedDay(day);
    setShowPlaceSearch(true);
  };

  const handleSelectPlace = async (place: any) => {
    if (!trip) return;

    try {
      console.log('📍 Adding place to trip:', place);
      
      // Calculate correct order_index for the selected day
      const destinationsForDay = trip.destinations?.filter(dest => dest.visit_date === selectedDay) || [];
      const nextOrderIndex = destinationsForDay.length + 1;
      
      // Create new destination from Google Places data
      const newDestination: Omit<Destination, 'id'> = {
        trip_id: trip.id,
        name: place.name,
        name_en: place.name,
        description: place.formatted_address || 'สถานที่ท่องเที่ยว',
        description_en: place.formatted_address || 'Tourist attraction',
        latitude: place.geometry?.location?.lat || 0,
        longitude: place.geometry?.location?.lng || 0,
        rating: place.rating || 4.0,
        visit_duration: 60, // Default 1 hour
        estimated_cost: place.price_level ? place.price_level * 100 : 100, // Estimate based on price level
        place_types: place.types || ['tourist_attraction'],
        photos: place.photos?.map((photo: any) => photo.photo_reference) || [],
        place_id: place.place_id,
        formatted_address: place.formatted_address,
        opening_hours: place.opening_hours,
        price_level: place.price_level,
        user_ratings_total: place.user_ratings_total,
        visit_date: selectedDay, // Use selected day
        order_index: nextOrderIndex // Correct order for the selected day
      };

      console.log('📍 Created destination:', newDestination);

      // [วิธีแก้] ใช้ tripService.addDestination สำหรับ INSERT แทน UPDATE
      await tripService.addDestination(trip.id, newDestination);

      // [เพิ่ม] อัปเดต State ทันทีเพื่อให้ UI แสดงผล
      console.log('🔄 Manually re-fetching trip data after adding destination...');
      const updatedTrip = await tripService.getTrip(trip.id);
      if (updatedTrip) {
        setTrip(updatedTrip);
        console.log('✅ Manually re-fetched and updated trip state after adding place.');
      } else {
        console.warn('⚠️ Failed to re-fetch trip data');
      }

      // ปิด Modal เมื่อทำงานเสร็จ
      setShowPlaceSearch(false);

      toast.success(`เพิ่ม ${place.name} ในแผนการเดินทางแล้ว!`);
    } catch (error) {
      console.error('Error adding destination:', error);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มสถานที่');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading trip...</p>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Trip not found</h1>
          <p className="text-gray-600">The trip you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Header - Mobile Responsive */}
      <div className="bg-white border-b shrink-0">
        <div className="px-3 sm:px-4 py-2 sm:py-4">
          {/* Mobile: Stack layout */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            {/* Title Row */}
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              {/* Logo - Click to go home */}
              <button
                onClick={() => navigate(`/${language}`)}
                className="shrink-0 flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition-opacity group"
                title={language === 'th' ? 'กลับหน้าแรก' : 'Go to Home'}
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center overflow-hidden border-2 border-white shadow-md group-hover:shadow-lg transition-shadow">
                  <img 
                    src="/TripsterIcon.png" 
                    alt="Tripster" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <span className="hidden sm:inline text-sm font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
                  Tripster
                </span>
              </button>
              
              {/* Divider */}
              <div className="hidden sm:block w-px h-6 bg-gray-200" />
              
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate max-w-[150px] sm:max-w-none">
                  {trip.title}
                </h1>
                <TripStatusButton
                  currentStatus={(trip.status as TripStatusType) || 'planning'}
                  onStatusChange={async (newStatus) => {
                    try {
                      await tripService.updateTripStatus(trip.id, newStatus);
                      setTrip(prev => prev ? { ...prev, status: newStatus } : prev);
                      toast.success(
                        newStatus === 'confirmed' ? '✅ ยืนยันแผนเรียบร้อย' :
                        newStatus === 'completed' ? '🎉 เสร็จสิ้นแล้ว!' :
                        'อัพเดท status เรียบร้อย'
                      );
                    } catch (error) {
                      toast.error('ไม่สามารถอัพเดท status ได้');
                    }
                  }}
                />
              </div>
              {/* User avatar - Hidden on mobile, visible on larger screens */}
              {user && (
                <div className="hidden md:flex items-center gap-2 bg-gray-50 rounded-full px-3 py-2 shrink-0">
                  {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
                    <img
                      src={user.user_metadata.avatar_url || user.user_metadata.picture}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-teal-400 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {user?.user_metadata?.display_name || user?.email || 'ผู้ใช้'}
                  </span>
                </div>
              )}
            </div>
            
            {/* Action Buttons - Scrollable on mobile */}
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1 sm:mx-0 sm:px-0">
              <Button variant="outline" onClick={handleShareTrip} size="sm" className="shrink-0">
                <Share2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Share</span>
              </Button>
              <ExportPDFButton trip={trip} size="sm" showLabel={false} />
              {user ? (
                <Button onClick={handleSaveTrip} size="sm" className="shrink-0">
                  <span className="hidden sm:inline">บันทึก</span>
                  <span className="sm:hidden">💾</span>
                </Button>
              ) : (
                <Button onClick={() => setShowLoginModal(true)} size="sm" className="shrink-0">
                  <LogIn className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">เข้าสู่ระบบ</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Mobile: Tabs, Desktop: Grid */}
      <div className="flex-1 min-h-0 p-2 sm:p-4">
        <div className="h-full">
          {/* Desktop: 3-column grid */}
          <div className="hidden lg:grid lg:grid-cols-3 gap-4 h-full">
            {/* ซ้าย - Chat Panel */}
            <div className="lg:col-span-1 h-full min-h-0">
              <Card className="h-full flex flex-col overflow-hidden">
                <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
                  <ChatPanel 
                    tripId={trip?.id}
                    onDestinationsUpdate={handleDestinationsUpdate}
                  />
                </CardContent>
              </Card>
            </div>

            {/* กลาง - Itinerary Panel */}
            <div className="lg:col-span-1 h-full min-h-0">
              <Card className="h-full flex flex-col overflow-hidden">
                <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
                  <ItineraryPanel 
                    destinations={trip.destinations}
                    onUpdate={handleDestinationsUpdate}
                    onAddDestination={handleAddDestination}
                    startDate={trip.start_date}
                    endDate={trip.end_date}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    onSelectedDayChange={setSelectedDay}
                    tripId={trip.id}
                  />
                </CardContent>
              </Card>
            </div>

            {/* ขวา - Map View */}
            <div className="lg:col-span-1 h-full min-h-0">
              <Card className="h-full flex flex-col overflow-hidden">
                <CardContent className="flex-1 min-h-0 p-0 relative">
                  <div className="absolute inset-0">
                    <ErrorBoundary>
                      <MapView destinations={trip.destinations} selectedDay={selectedDay} />
                    </ErrorBoundary>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Mobile/Tablet: Tabbed interface */}
          <div className="lg:hidden h-full flex flex-col">
            <MobileTripTabs
              trip={trip}
              selectedDay={selectedDay}
              viewMode={viewMode}
              onDestinationsUpdate={handleDestinationsUpdate}
              onAddDestination={handleAddDestination}
              onViewModeChange={setViewMode}
              onSelectedDayChange={setSelectedDay}
            />
          </div>
        </div>
      </div>

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowLoginPrompt(false)}
        >
          <Card 
            className="w-full max-w-md mx-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLoginPrompt(false)}
              className="absolute top-3 right-3 h-8 w-8 rounded-full hover:bg-gray-100 z-10"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
            <CardHeader>
              <CardTitle className="text-center">🎉 Save Your Trip!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-gray-600">
                To save this trip and access it later, please sign in
              </p>
              <div className="space-y-2">
                <p className="text-sm text-gray-500">You'll be able to:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>✅ Save and access your trips</li>
                  <li>✅ Share with friends and family</li>
                  <li>✅ Export to PDF</li>
                  <li>✅ Get personalized recommendations</li>
                </ul>
              </div>
              <div className="flex space-x-2">
                <Button className="flex-1">
                  Sign In
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowLoginPrompt(false)}
                >
                  Continue as Guest
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
      />

      {/* Place Search Modal */}
      <PlaceSearch
        isOpen={showPlaceSearch}
        onClose={() => setShowPlaceSearch(false)}
        onSelectPlace={handleSelectPlace}
        day={selectedDay}
      />

      {/* Share Dialog */}
      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        tripId={trip?.id || ''}
        tripTitle={trip?.title || ''}
      />
    </div>
  );
};

export default TripPlanner;