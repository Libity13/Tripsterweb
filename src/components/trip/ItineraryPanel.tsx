// ItineraryPanel Component - Drag and drop destination list with Google Places integration
import { useState, useEffect } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GripVertical, MapPin, Clock, DollarSign, Star, Trash2, Edit, Calendar, ExternalLink, Image, Plus, List, Grid3X3, Navigation, TrendingDown, AlertTriangle, CheckCircle, Info, Phone, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { databaseSyncService } from '@/services/databaseSyncService';
import { routeOptimizationService } from '@/services/routeOptimizationService';
import { supabase } from '@/lib/unifiedSupabaseClient';
import { Destination } from '@/types/database';
import { RouteOptimizationModal } from '@/components/RouteOptimizationModal';
import { RouteOptimizationLoadingModal } from '@/components/RouteOptimizationLoadingModal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ItineraryPanelProps {
  destinations: Destination[];
  onUpdate: (destinations: Destination[]) => void;
  onDestinationClick?: (destination: Destination) => void;
  onRemoveDestination?: (destinationId: string) => void;
  onEditDestination?: (destination: Destination) => void;
  onAddDestination?: (day: number) => void;
  startDate?: string;
  endDate?: string;
  viewMode?: 'grid' | 'timeline';
  onViewModeChange?: (mode: 'grid' | 'timeline') => void;
  onSelectedDayChange?: (day: number) => void;
  tripId?: string;
}

// Google Places API integration
const useGooglePlaces = (destination: Destination) => {
  const [placeDetails, setPlaceDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // [แก้ไข] เปลี่ยนเป็น !destination.place_id || destination.formatted_address
    // ถ้ามี formatted_address อยู่แล้ว (อาจจะมาจาก AI/Search) ก็ไม่ต้องโหลดซ้ำ
    if (!destination.place_id || placeDetails) return;

    const fetchPlaceDetails = async () => {
      setLoading(true);
      try {
        // [วิธีแก้] เรียกใช้ Edge Function แทน fetch ตรงๆ
        const { data, error } = await supabase.functions.invoke('google-places', {
          body: {
            type: 'details',
            place_id: destination.place_id,
            fields: 'name,formatted_address,rating,user_ratings_total,price_level,opening_hours,photos,website,international_phone_number', // ขอข้อมูลเพิ่ม
            language: 'th' // เพิ่มภาษา
          }
        });

        if (error) {
          console.error(`Error fetching details for ${destination.name}:`, error);
        } else if (data?.result) {
          console.log(`✅ Fetched details for ${destination.name}:`, data.result);
          setPlaceDetails(data.result);
        } else {
          console.warn(`⚠️ No details found for ${destination.name}`);
        }

      } catch (error) {
        console.error(`Error invoking edge function for ${destination.name}:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaceDetails();
  }, [destination.place_id, placeDetails]); // เพิ่ม placeDetails ใน dependency array

  // [เพิ่ม] คืนค่า placeDetails ที่อาจมีอยู่แล้วจากตอนสร้าง
  // เพื่อให้ UI แสดงผลได้เร็วขึ้น ไม่ต้องรอโหลดใหม่ทุกครั้ง
  const initialDetails = {
      formatted_address: destination.formatted_address,
      rating: destination.rating,
      user_ratings_total: destination.user_ratings_total,
      price_level: destination.price_level,
      opening_hours: destination.opening_hours,
      photos: destination.photos?.map(ref => ({ photo_reference: ref })) // แปลงกลับเป็น format ที่ Google ใช้
  };

  return { placeDetails: placeDetails ?? initialDetails, loading };
};

// Sortable Item Component
const SortableItem = ({ 
  destination, 
  onRemove, 
  onEdit, 
  onClick 
}: { 
  destination: Destination;
  onRemove: (id: string) => void;
  onEdit: (destination: Destination) => void;
  onClick: (destination: Destination) => void;
}) => {
  const { placeDetails, loading } = useGooglePlaces(destination);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: destination.id });

  // 🆕 Smooth spring-like animation for DnD
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)', // Smooth spring easing
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
    scale: isDragging ? '1.02' : '1',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border rounded-lg p-3 mb-2 cursor-pointer hover:shadow-md transition-shadow duration-200 ${
        isDragging ? 'shadow-xl ring-2 ring-blue-400 ring-opacity-50' : ''
      }`}
      onClick={() => onClick(destination)}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle - touch-action: none ป้องกัน text selection บนมือถือ */}
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 p-2 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing touch-none select-none"
          onContextMenu={(e) => e.preventDefault()}
          style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
        >
          <GripVertical className="h-5 w-5 text-gray-400" />
        </div>

        {/* Destination Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-gray-900 mb-1">
                {destination.name}
              </h3>
              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                {destination.description}
              </p>
              
              {/* Google Places Details */}
              {placeDetails && (
                <div className="mb-2 space-y-1">
                  {placeDetails.formatted_address && (
                    <p className="text-xs text-gray-500 flex items-start gap-1">
                      <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1">{placeDetails.formatted_address}</span>
                    </p>
                  )}
                  {placeDetails.opening_hours && (
                    <div className="flex items-center gap-1 text-xs">
                      <span className={`w-2 h-2 rounded-full ${placeDetails.opening_hours.open_now ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      <span className={placeDetails.opening_hours.open_now ? 'text-green-600' : 'text-red-600'}>
                        {placeDetails.opening_hours.open_now ? 'เปิดอยู่' : 'ปิดอยู่'}
                      </span>
                      {placeDetails.opening_hours.weekday_text && placeDetails.opening_hours.weekday_text.length > 0 && (
                        <span className="text-gray-400 ml-1">
                          ({placeDetails.opening_hours.weekday_text[0]})
                        </span>
                      )}
                    </div>
                  )}
                  {placeDetails.photos && placeDetails.photos.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <Image className="h-3 w-3" />
                      <span>มีรูปภาพ {placeDetails.photos.length} รูป</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Stats */}
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500" />
                  <span className="font-medium">{placeDetails?.rating || destination.rating}</span>
                  {placeDetails?.user_ratings_total && (
                    <span className="text-gray-400">({placeDetails.user_ratings_total.toLocaleString()})</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-blue-500" />
                  <span>{destination.visit_duration} นาที</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-green-500" />
                  <span>฿{(destination.estimated_cost || 0).toLocaleString()}</span>
                  {placeDetails?.price_level && (
                    <span className="text-gray-400">
                      ({'$'.repeat(placeDetails.price_level)})
                    </span>
                  )}
                </div>
              </div>

              {/* Place Types */}
              <div className="flex flex-wrap gap-1 mt-2">
                {/* Primary place type */}
                {destination.place_type && (
                  <Badge 
                    variant={destination.place_type === 'lodging' ? 'default' : 
                            destination.place_type === 'restaurant' ? 'destructive' : 'secondary'} 
                    className="text-xs"
                  >
                    {destination.place_type === 'lodging' ? '🏨 ที่พัก' :
                     destination.place_type === 'restaurant' ? '🍽️ ร้านอาหาร' :
                     destination.place_type === 'tourist_attraction' ? '🏛️ ที่เที่ยว' : destination.place_type}
                  </Badge>
                )}
                {/* Additional place types */}
                {destination.place_types && destination.place_types.slice(0, 2).map((type, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {type.replace('_', ' ')}
                  </Badge>
                ))}
                {destination.place_types && destination.place_types.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{destination.place_types.length - 2}
                  </Badge>
                )}
              </div>

              {/* Google Photos */}
              {placeDetails?.photos && placeDetails.photos.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {placeDetails.photos.slice(0, 3).map((photo: any, index: number) => (
                      <div key={index} className="w-8 h-8 bg-gray-200 rounded overflow-hidden">
                        <img 
                          src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=100&photo_reference=${photo.photo_reference}&key=${import.meta.env.VITE_GOOGLE_PLACES_API_KEY}`}
                          alt={destination.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {placeDetails.photos.length > 3 && (
                      <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                        +{placeDetails.photos.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 ml-2">
              {placeDetails && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`https://www.google.com/maps/place/?q=place_id:${destination.place_id}`, '_blank');
                  }}
                  className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700"
                  title="ดูใน Google Maps"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(destination.id);
                }}
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ItineraryPanel = ({ 
  destinations, 
  onUpdate, 
  onDestinationClick, 
  onRemoveDestination, 
  onEditDestination, 
  onAddDestination,
  startDate,
  endDate,
  viewMode = 'grid',
  onViewModeChange,
  onSelectedDayChange,
  tripId
}: ItineraryPanelProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [dailyTimeEstimates, setDailyTimeEstimates] = useState<Map<number, any>>(new Map());
  
  // Route Optimization Modal state
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);
  const [optimizationData, setOptimizationData] = useState<{
    dayNumber: number;
    originalRoute: Destination[];
    optimizedRoute: Destination[];
    originalDistance: number;
    optimizedDistance: number;
    savings: { distance: number; time: number; percentage: number };
  } | null>(null);

  // Calculate number of days
  const calculateDays = () => {
    if (!startDate || !endDate) {
      return 1;
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Remove +1 to get correct day count
    
    return Math.max(1, diffDays);
  };

  // Derive total days from start/end date and ensure it covers max visit_date
  const derivedDays = calculateDays();
  const maxVisitDay = destinations.reduce((max, d) => {
    const day = d.visit_date ? Number(d.visit_date) : 1;
    return Math.max(max, isNaN(day) ? 1 : day);
  }, 1);
  const totalDays = Math.max(derivedDays, maxVisitDay);

  // Group destinations by visit_date for the requested day
  const getDestinationsForDay = (day: number) => {
    const dayNum = Number(day);
    return destinations
      .filter(d => (d.visit_date ? Number(d.visit_date) : 1) === dayNum)
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  };

  // Debug: Log destinations and days (only in development)
  if (import.meta.env.DEV) {
    console.log('🔍 ItineraryPanel Debug:', {
      totalDestinations: destinations.length,
      totalDays,
      startDate,
      endDate
    });
  }

  // Calculate day-specific stats
  const getDayStats = (day: number) => {
    const dayDestinations = getDestinationsForDay(day);
    const dayDuration = dayDestinations.reduce((sum, dest) => sum + (dest.visit_duration || 0), 0);
    const dayCost = dayDestinations.reduce((sum, dest) => sum + (dest.estimated_cost || 0), 0);
    return { duration: dayDuration, cost: dayCost };
  };

  // Calculate daily time estimates and validations
  useEffect(() => {
    const calculateDailyEstimates = async () => {
      const estimates = new Map();
      
      for (let day = 1; day <= totalDays; day++) {
        const dayDestinations = getDestinationsForDay(day);
        
        if (dayDestinations.length > 0) {
          try {
            const timeEstimate = await routeOptimizationService.estimateDailyTime(dayDestinations);
            const planValidation = routeOptimizationService.validateDailyPlan(dayDestinations);
            
            estimates.set(day, {
              timeEstimate,
              planValidation
            });
          } catch (error) {
            console.error(`Error calculating estimates for day ${day}:`, error);
          }
        }
      }
      
      setDailyTimeEstimates(estimates);
    };

    calculateDailyEstimates();
  }, [destinations, totalDays]);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // ต้องลาก 5px ก่อนจะเริ่ม drag
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // กดค้าง 200ms ก่อนจะเริ่ม drag บนมือถือ
        tolerance: 8, // อนุญาตให้ขยับ 8px ระหว่างรอ (ป้องกัน accidental cancel)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const draggedDestination = destinations.find(item => item.id === active.id);
    const targetDestination = destinations.find(item => item.id === over.id);
    
    if (!draggedDestination || !targetDestination) return;
    
    // Get day information
    const draggedDay = draggedDestination.visit_date || 1;
    const targetDay = targetDestination.visit_date || 1;
    
    // CRITICAL: Only allow dragging within the same day
    // Cross-day moves should be done via the "Move to Day X" button
    if (draggedDay !== targetDay) {
      toast.error(`ไม่สามารถลากข้ามวันได้ กรุณาใช้ปุ่ม "ย้ายไปวันที่ ${targetDay}" แทน`);
      return;
    }
    
    // Determine if moving across days
    const movedToDifferentDay = false; // Always false now since we block cross-day drags
    
    if (import.meta.env.DEV) {
      console.log('🔄 Drag & Drop:', {
        destination: draggedDestination.name,
        fromDay: draggedDay,
        toDay: targetDay,
        crossDay: movedToDifferentDay
      });
    }
    
    // Find positions in the full destinations array
    const oldIndex = destinations.findIndex(item => item.id === active.id);
    const newIndex = destinations.findIndex(item => item.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    // 1. Move the item in the array
    const reorderedDestinations = arrayMove(destinations, oldIndex, newIndex);
    
    // 2. Update visit_date if moving to a different day
    if (movedToDifferentDay) {
      const movedDestIndex = reorderedDestinations.findIndex(d => d.id === active.id);
      if (movedDestIndex !== -1) {
        reorderedDestinations[movedDestIndex] = {
          ...reorderedDestinations[movedDestIndex],
          visit_date: targetDay
        };
      }
    }
    
    // 3. Group destinations by day and renormalize order_index
    const destinationsByDay: Record<number, Destination[]> = {};
    reorderedDestinations.forEach(dest => {
      const day = dest.visit_date || 1;
      if (!destinationsByDay[day]) destinationsByDay[day] = [];
      destinationsByDay[day].push(dest);
    });
    
    // 4. Rebuild array with correct order_index for each day
    const newDestinations: Destination[] = [];
    Object.keys(destinationsByDay)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach(day => {
        const dayDests = destinationsByDay[day];
        dayDests.forEach((dest, index) => {
          newDestinations.push({
            ...dest,
            visit_date: day,
            order_index: index + 1
          });
        });
      });
    
    // 5. Update local state (optimistic update)
    onUpdate(newDestinations);
    
    // 6. Sync to database if tripId is available
    if (tripId) {
      try {
        await databaseSyncService.syncDestinationsOrder(newDestinations, tripId);
        if (movedToDifferentDay) {
          toast.success(`ย้าย ${draggedDestination.name} ไปวันที่ ${targetDay} แล้ว`);
        } else {
          toast.success(`ย้าย ${draggedDestination.name} ไปตำแหน่งใหม่แล้ว`);
        }
      } catch (error) {
        console.error('❌ Error syncing destinations order:', error);
        toast.error('เกิดข้อผิดพลาดในการบันทึกการเปลี่ยนแปลง');
        
        // Rollback optimistic update
        onUpdate(destinations);
      }
    } else {
      if (movedToDifferentDay) {
        toast.success(`ย้าย ${draggedDestination.name} ไปวันที่ ${targetDay} แล้ว`);
      } else {
        toast.success(`ย้าย ${draggedDestination.name} ไปตำแหน่งใหม่แล้ว`);
      }
    }
  };

  const handleRemove = (destinationId: string) => {
    const newDestinations = destinations.filter(dest => dest.id !== destinationId);
    onUpdate(newDestinations);
    if (onRemoveDestination) {
      onRemoveDestination(destinationId);
    }
  };

  const handleEdit = (destination: Destination) => {
    if (onEditDestination) {
      onEditDestination(destination);
    }
  };

  const handleClick = (destination: Destination) => {
    if (onDestinationClick) {
      onDestinationClick(destination);
    }
  };

  // Handle route optimization for a specific day
  const handleOptimizeRoute = async (day: number) => {
    const dayDestinations = getDestinationsForDay(day);
    
    if (dayDestinations.length < 2) {
      toast.info('ต้องมีอย่างน้อย 2 สถานที่เพื่อทำการ optimize');
      return;
    }

    // Check if destinations have coordinates
    const destinationsWithCoords = dayDestinations.filter(d => d.latitude && d.longitude);
    if (destinationsWithCoords.length < 2) {
      toast.warning('สถานที่ส่วนใหญ่ยังไม่มีพิกัด ไม่สามารถ optimize ได้');
      return;
    }

    try {
      // Show loading modal
      setShowLoadingModal(true);
      
      // Calculate current route distance
      const originalRouteData = await routeOptimizationService.calculateRouteDistanceReal(dayDestinations);
      const originalDistanceKm = originalRouteData.totalDistance;
      
      // Use smart optimization with real Google Directions API distances
      const optimized = await routeOptimizationService.smartOptimizeRouteReal(dayDestinations);
      
      // Calculate savings
      const savedDistance = optimized.improvements.savedDistance;
      const savedTime = Math.round(optimized.improvements.savedTime);
      const percentage = originalDistanceKm > 0 
        ? (savedDistance / originalDistanceKm) * 100 
        : 0;
      
      // Hide loading modal
      setShowLoadingModal(false);
      
      // Store optimization data and show result modal
      setOptimizationData({
        dayNumber: day,
        originalRoute: dayDestinations,
        optimizedRoute: optimized.destinations,
        originalDistance: originalDistanceKm,
        optimizedDistance: originalDistanceKm - savedDistance,
        savings: {
          distance: savedDistance,
          time: savedTime,
          percentage: percentage
        }
      });
      
      setShowOptimizationModal(true);
      
    } catch (error) {
      console.error('❌ Error optimizing route:', error);
      setShowLoadingModal(false);
      toast.error('เกิดข้อผิดพลาดในการคำนวณเส้นทาง');
    }
  };

  const confirmOptimization = async () => {
    if (!optimizationData) return;

    try {
      const { dayNumber, optimizedRoute } = optimizationData;
      
      // Update order_index for optimized destinations
      const updatedDayDestinations = optimizedRoute.map((dest, index) => ({
        ...dest,
        order_index: index + 1
      }));
      
      // Merge with other days
      const otherDaysDestinations = destinations.filter(d => (d.visit_date || 1) !== dayNumber);
      const newDestinations = [...otherDaysDestinations, ...updatedDayDestinations].sort((a, b) => {
        const dayA = a.visit_date || 1;
        const dayB = b.visit_date || 1;
        if (dayA !== dayB) return dayA - dayB;
        return (a.order_index || 0) - (b.order_index || 0);
      });
      
      onUpdate(newDestinations);
      
      // Sync to database if tripId is available
      if (tripId) {
        await databaseSyncService.syncDestinationsOrder(newDestinations, tripId);
      }
      
      toast.success(
        `✨ ปรับเส้นทางสำเร็จ! ประหยัด ${optimizationData.savings.distance.toFixed(1)} km (${optimizationData.savings.time} นาที)`,
        { duration: 5000 }
      );
      
      setShowOptimizationModal(false);
      setOptimizationData(null);
      
    } catch (error) {
      console.error('❌ Error applying optimization:', error);
      toast.error('เกิดข้อผิดพลาดในการปรับเส้นทาง');
    }
  };

  const totalDuration = destinations.reduce((sum, dest) => sum + dest.visit_duration, 0);
  const totalCost = destinations.reduce((sum, dest) => sum + dest.estimated_cost, 0);

  return (
    <>
      {/* Loading Modal */}
      <RouteOptimizationLoadingModal open={showLoadingModal} />
      
      {/* Route Optimization Result Modal */}
      {optimizationData && (
        <RouteOptimizationModal
          open={showOptimizationModal}
          onClose={() => {
            setShowOptimizationModal(false);
            setOptimizationData(null);
          }}
          onConfirm={confirmOptimization}
          dayNumber={optimizationData.dayNumber}
          originalRoute={optimizationData.originalRoute}
          optimizedRoute={optimizationData.optimizedRoute}
          originalDistance={optimizationData.originalDistance}
          optimizedDistance={optimizationData.optimizedDistance}
          savings={optimizationData.savings}
        />
      )}
      
      <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Your Itinerary
          </CardTitle>
          {destinations.length > 0 && onViewModeChange && (
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onViewModeChange('grid')}
                className="h-8 px-3"
              >
                <Grid3X3 className="h-4 w-4 mr-1" />
                Grid
              </Button>
              <Button
                variant={viewMode === 'timeline' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onViewModeChange('timeline')}
                className="h-8 px-3"
              >
                <List className="h-4 w-4 mr-1" />
                Timeline
              </Button>
            </div>
          )}
        </div>
        {destinations.length > 0 && (
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{Math.round(totalDuration / 60)}h {totalDuration % 60}m</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              <span>฿{totalCost.toLocaleString()}</span>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-hidden p-0">
        {destinations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="mx-auto h-12 w-12 mb-4 text-gray-300" />
            <p className="text-sm font-medium">No destinations yet</p>
            <p className="text-xs">Ask AI to add some places to your trip!</p>
          </div>
        ) : viewMode === 'timeline' ? (
          // Timeline View with Tabs
          <Tabs value={selectedDay.toString()} onValueChange={(value) => {
            const newDay = parseInt(value);
            setSelectedDay(newDay);
            onSelectedDayChange?.(newDay);
          }} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              {Array.from({ length: totalDays }, (_, i) => {
                const dayStats = getDayStats(i + 1);
                return (
                  <TabsTrigger key={i + 1} value={(i + 1).toString()} className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Day {i + 1}</span>
                    {dayStats.duration > 0 && (
                      <div className="ml-1 text-xs text-gray-500">
                        ({Math.round(dayStats.duration / 60)}h)
                      </div>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            
            {Array.from({ length: totalDays }, (_, i) => {
              const dayDestinations = getDestinationsForDay(i + 1);
              const dayStats = getDayStats(i + 1);
              
              return (
                <TabsContent key={i + 1} value={(i + 1).toString()} className="flex-1 overflow-hidden">
                  <div className="h-full overflow-y-auto">
                    <Card className="border-l-4 border-l-blue-500">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                                {i + 1}
                              </div>
                              <span>วันที่ {i + 1}</span>
                            </div>
                          </CardTitle>
                          <div className="text-sm text-gray-600">
                            {dayStats.duration > 0 && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{Math.round(dayStats.duration / 60)}h {dayStats.duration % 60}m</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      {/* Daily Time Summary & Warnings */}
                      {dayDestinations.length > 0 && dailyTimeEstimates.get(i + 1) && (
                        <div className="px-6 py-3 bg-gray-50 border-t border-b">
                          {(() => {
                            const estimates = dailyTimeEstimates.get(i + 1);
                            const { timeEstimate, planValidation } = estimates;
                            
                            return (
                              <div className="space-y-2">
                                {/* Time Breakdown */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Clock className="h-4 w-4 text-gray-600" />
                                    <span className="font-medium">เวลารวม: {timeEstimate.totalHours.toFixed(1)} ชั่วโมง</span>
                                    {timeEstimate.isOverLimit && (
                                      <Badge variant="destructive" className="ml-2">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        เกินเวลาแนะนำ
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {/* Progress Bar */}
                                  <div className="flex items-center gap-2">
                                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full ${
                                          timeEstimate.totalHours > 8 ? 'bg-red-500' : 
                                          timeEstimate.totalHours > 6 ? 'bg-yellow-500' : 
                                          'bg-green-500'
                                        }`}
                                        style={{ width: `${Math.min((timeEstimate.totalHours / 10) * 100, 100)}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-gray-500">{timeEstimate.totalHours.toFixed(1)}/8h</span>
                                  </div>
                                </div>

                                {/* Time Breakdown Details */}
                                <div className="grid grid-cols-4 gap-2 text-xs text-gray-600">
                                  <div>🏛️ ท่องเที่ยว: {timeEstimate.breakdown.visiting.toFixed(1)}h</div>
                                  <div>🚗 เดินทาง: {timeEstimate.breakdown.travel.toFixed(1)}h</div>
                                  <div>🍽️ อาหาร: {timeEstimate.breakdown.meals.toFixed(1)}h</div>
                                  <div>⏱️ Buffer: {timeEstimate.breakdown.buffer.toFixed(1)}h</div>
                                </div>

                                {/* Missing Components Warning */}
                                {!planValidation.isComplete && (
                                  <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                    <Info className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                    <div className="text-xs text-yellow-800">
                                      <span className="font-medium">แผนยังไม่สมบูรณ์:</span> 
                                      {' '}ควรเพิ่ม {planValidation.suggestions.join(', ')}
                                    </div>
                                  </div>
                                )}

                                {/* Warnings */}
                                {timeEstimate.warnings.length > 0 && (
                                  <div className="space-y-1">
                                    {timeEstimate.warnings.map((warning: string, idx: number) => (
                                      <div key={idx} className="flex items-start gap-2 text-xs text-orange-700">
                                        <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                        <span>{warning}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      <CardContent>
                        {dayDestinations.length === 0 ? (
                          <div className="text-center py-4 text-gray-400">
                            <p className="text-sm">ไม่มีสถานที่ในวันนี้</p>
                            {onAddDestination && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onAddDestination(i + 1)}
                                className="mt-2"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                เพิ่มสถานที่
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {dayDestinations.map((destination, index) => (
                              <div key={destination.id}>
                                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                                      {index + 1}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {9 + index * 2}:00
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <h3 className="font-medium text-gray-900">{destination.name}</h3>
                                    <p className="text-sm text-gray-600">{destination.description}</p>
                                    
                                    {/* Basic Info */}
                                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                      {destination.rating && destination.rating > 0 && (
                                        <div className="flex items-center gap-1">
                                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                          <span className="font-medium">{destination.rating.toFixed(1)}</span>
                                          {destination.user_ratings_total && (
                                            <span className="text-gray-400">({destination.user_ratings_total})</span>
                                          )}
                                        </div>
                                      )}
                                      {destination.price_level !== null && destination.price_level !== undefined && (
                                        <div className="flex items-center gap-1">
                                          <DollarSign className="h-3 w-3 text-green-500" />
                                          <span>{'฿'.repeat(destination.price_level || 1)}</span>
                                        </div>
                                      )}
                                      {destination.estimated_cost && destination.estimated_cost > 0 && (
                                        <div className="flex items-center gap-1">
                                          <DollarSign className="h-3 w-3 text-green-500" />
                                          <span>฿{destination.estimated_cost}</span>
                                        </div>
                                      )}
                                      {destination.visit_duration && (
                                        <div className="flex items-center gap-1">
                                          <Clock className="h-3 w-3 text-blue-500" />
                                          <span>{destination.visit_duration} นาที</span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Enhanced Place Details */}
                                    {(destination.opening_hours || destination.phone_number || destination.website) && (
                                      <div className="mt-2 space-y-1">
                                        {/* Opening Hours */}
                                        {destination.opening_hours && (
                                          <div className="flex items-center gap-1 text-xs">
                                            <Clock className="h-3 w-3 text-gray-400" />
                                            {(destination.opening_hours as any).open_now !== undefined ? (
                                              <Badge 
                                                variant={(destination.opening_hours as any).open_now ? 'default' : 'secondary'}
                                                className="h-4 px-1.5 text-xs"
                                              >
                                                {(destination.opening_hours as any).open_now ? '🟢 เปิดอยู่' : '🔴 ปิดแล้ว'}
                                              </Badge>
                                            ) : (
                                              <span className="text-gray-500">เวลาเปิด-ปิด: ดูรายละเอียด</span>
                                            )}
                                          </div>
                                        )}
                                        
                                        {/* Phone Number */}
                                        {destination.phone_number && (
                                          <div className="flex items-center gap-1 text-xs">
                                            <Phone className="h-3 w-3 text-gray-400" />
                                            <a 
                                              href={`tel:${destination.phone_number}`}
                                              className="text-blue-600 hover:underline"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              {destination.phone_number}
                                            </a>
                                          </div>
                                        )}
                                        
                                        {/* Website */}
                                        {destination.website && (
                                          <div className="flex items-center gap-1 text-xs">
                                            <Globe className="h-3 w-3 text-gray-400" />
                                            <a 
                                              href={destination.website}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:underline"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              เว็บไซต์
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleClick(destination)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <MapPin className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleRemove(destination.id)}
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>

                                {/* Distance indicator to next destination - Clickable to open Google Maps */}
                                {index < dayDestinations.length - 1 && (() => {
                                  const nextDest = dayDestinations[index + 1];
                                  if (destination.latitude && destination.longitude && nextDest.latitude && nextDest.longitude) {
                                    const distance = routeOptimizationService.calculateDistance(
                                      destination.latitude,
                                      destination.longitude,
                                      nextDest.latitude,
                                      nextDest.longitude
                                    );
                                    const validation = routeOptimizationService.validateDistance(distance, false);
                                    
                                    // 🆕 Create Google Maps directions URL
                                    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${destination.latitude},${destination.longitude}&destination=${nextDest.latitude},${nextDest.longitude}&travelmode=driving`;
                                    
                                    return (
                                      <div className="flex items-center justify-center my-2">
                                        <a
                                          href={googleMapsUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs cursor-pointer transition-all hover:scale-105 hover:shadow-md ${
                                            validation.severity === 'error' ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' :
                                            validation.severity === 'warning' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200 hover:bg-yellow-100' :
                                            'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                          }`}
                                          title="คลิกเพื่อเปิด Google Maps นำทาง"
                                        >
                                          <Navigation className="h-3 w-3" />
                                          <span>{distance.toFixed(1)} กม.</span>
                                          <span className="text-gray-500">•</span>
                                          <span>{Math.round((distance / 40) * 60)} นาที</span>
                                          {validation.message && (
                                            <span className="ml-1">{validation.message.split(' ')[0]}</span>
                                          )}
                                        </a>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        ) : (
          // Grid View (Original) - DndContext wraps all tabs to enable cross-day dragging
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={getDestinationsForDay(selectedDay).map(dest => dest.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="h-full flex flex-col">
                {/* Custom Tab List */}
                <div className="grid w-full grid-cols-3 gap-1 mb-4 bg-gray-100 p-1 rounded-lg">
                  {Array.from({ length: totalDays }, (_, i) => {
                    const dayStats = getDayStats(i + 1);
                    const isActive = selectedDay === i + 1;
                    return (
                      <button
                        key={i + 1}
                        onClick={() => {
                          setSelectedDay(i + 1);
                          onSelectedDayChange?.(i + 1);
                        }}
                        className={`flex items-center justify-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'bg-transparent text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <Calendar className="h-3 w-3" />
                        <span>Day {i + 1}</span>
                        {dayStats.duration > 0 && (
                          <div className="ml-1 text-xs text-gray-500">
                            ({Math.round(dayStats.duration / 60)}h)
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                {/* All tabs render at once, visibility controlled by CSS */}
                <div className="flex-1 overflow-hidden relative">
                  {Array.from({ length: totalDays }, (_, i) => {
                    const dayDestinations = getDestinationsForDay(i + 1);
                    const isActive = selectedDay === i + 1;
                    const dayStats = getDayStats(i + 1);
                    const totalDistance = routeOptimizationService.calculateRouteDistance(dayDestinations);
                    
                    return (
                      <div
                        key={i + 1}
                        className={`h-full overflow-y-auto absolute inset-0 transition-opacity ${
                          isActive ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
                        }`}
                      >
                        <div className="space-y-2">
                          {/* Route Stats Banner */}
                          {dayDestinations.length >= 2 && totalDistance > 0 && (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Navigation className="h-4 w-4 text-blue-600" />
                                  <div className="text-sm">
                                    <span className="font-medium text-gray-900">ระยะทางรวม:</span>{' '}
                                    <span className="text-blue-600 font-semibold">{totalDistance.toFixed(1)} km</span>
                                    <span className="text-gray-500 text-xs ml-2">
                                      (~{Math.round((totalDistance / 40) * 60)} นาที)
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOptimizeRoute(i + 1)}
                                  className="h-8 px-3 bg-white hover:bg-blue-50 border-blue-300 text-blue-700 hover:text-blue-800"
                                >
                                  <TrendingDown className="h-3 w-3 mr-1.5" />
                                  Optimize
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {dayDestinations.length === 0 ? (
                            <div className="text-center py-4 text-gray-400">
                              <p className="text-sm">No destinations for Day {i + 1}</p>
                              <p className="text-xs">Ask AI to add places for this day!</p>
                              {onAddDestination && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onAddDestination(i + 1)}
                                  className="mt-2"
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  เพิ่มสถานที่
                                </Button>
                              )}
                            </div>
                          ) : (
                            dayDestinations.map((destination, index) => (
                              <div key={destination.id} className="relative">
                                {/* Order Number */}
                                <div className="absolute -left-2 -top-2 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium z-10">
                                  {index + 1}
                                </div>
                                
                                {/* Distance to next destination - Clickable to open Google Maps */}
                                {index < dayDestinations.length - 1 && (
                                  <div className="absolute -bottom-3 left-4 right-4 z-0">
                                    <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
                                      {destination.latitude && destination.longitude && 
                                       dayDestinations[index + 1].latitude && dayDestinations[index + 1].longitude && (
                                        <>
                                          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                                          <a
                                            href={`https://www.google.com/maps/dir/?api=1&origin=${destination.latitude},${destination.longitude}&destination=${dayDestinations[index + 1].latitude},${dayDestinations[index + 1].longitude}&travelmode=driving`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-white px-2 py-0.5 rounded-full border border-gray-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all cursor-pointer"
                                            title="คลิกเพื่อเปิด Google Maps นำทาง"
                                          >
                                            {routeOptimizationService['calculateDistance'](
                                              destination.latitude,
                                              destination.longitude,
                                              dayDestinations[index + 1].latitude!,
                                              dayDestinations[index + 1].longitude!
                                            ).toFixed(1)} km
                                          </a>
                                          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                <SortableItem
                                  destination={destination}
                                  onRemove={handleRemove}
                                  onEdit={handleEdit}
                                  onClick={handleClick}
                                />
                              </div>
                            ))
                          )}
                          
                          {/* Add Location Button at the end of each day */}
                          {onAddDestination && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onAddDestination(i + 1)}
                                className="w-full"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                เพิ่มสถานที่ในวันนี้
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Instructions */}
        {destinations.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700">
              💡 Drag destinations to reorder your itinerary (you can now drag across days!)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
};

export default ItineraryPanel;
