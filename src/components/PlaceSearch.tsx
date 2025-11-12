// PlaceSearch Component - Search and add places to itinerary
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { MapPin, Star, Clock, DollarSign, ExternalLink, Plus, Loader2, Search, Filter, X } from 'lucide-react';
import { supabase } from '@/lib/unifiedSupabaseClient';

interface Place {
  place_id: string;
  name: string;
  formatted_address: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  photos?: Array<{ photo_reference: string }>;
  types?: string[];
  opening_hours?: {
    open_now: boolean;
  };
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface PlaceSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlace: (place: Place) => void;
  day?: number;
  tripId?: string;
}

const PlaceSearch = ({ isOpen, onClose, onSelectPlace, day, tripId }: PlaceSearchProps) => {
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      // Use Edge Function with type filter
      const { data, error } = await supabase.functions.invoke('google-places', {
        body: {
          type: 'textsearch',
          q: query,
          language: 'th',
          region: 'th',
          params: {
            type: selectedType === 'all' ? undefined : selectedType,
            fields: 'place_id,geometry,formatted_address,name,photos,rating,user_ratings_total,types,opening_hours,price_level'
          }
        }
      });

      if (error) {
        console.error('Search error:', error);
        setPlaces([]);
      } else {
        setPlaces(data?.results || []);
      }
    } catch (error) {
      console.error('Search error:', error);
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlace = async (place: Place) => {
    setSelectedPlace(place);
    try {
      // Get place details using Edge Function
      const { data, error } = await supabase.functions.invoke('google-places', {
        body: {
          type: 'details',
          place_id: place.place_id,
          fields: 'place_id,geometry,formatted_address,name,photos,rating,user_ratings_total,types,opening_hours,price_level'
        }
      });

      if (error) {
        console.error('Error getting place details:', error);
        onSelectPlace(place);
      } else {
        const enhancedPlace = { ...place, ...data?.result };
        onSelectPlace(enhancedPlace);
      }
      onClose();
    } catch (error) {
      console.error('Error getting place details:', error);
      onSelectPlace(place);
      onClose();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getPriceLevel = (level?: number) => {
    if (!level) return '';
    return '$'.repeat(level);
  };

  const getPlaceType = (types?: string[]) => {
    if (!types) return '';
    const mainTypes = types.filter(type => 
      !type.includes('establishment') && 
      !type.includes('point_of_interest')
    );
    return mainTypes[0]?.replace(/_/g, ' ') || '';
  };

  const getOpeningStatus = (openingHours?: any) => {
    if (!openingHours) return null;
    return openingHours.open_now ? 'เปิดอยู่' : 'ปิดแล้ว';
  };

  const getOpeningStatusColor = (openingHours?: any) => {
    if (!openingHours) return 'text-gray-500';
    return openingHours.open_now ? 'text-green-600' : 'text-red-600';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden" aria-describedby="place-search-description">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {day ? `เพิ่มสถานที่สำหรับวันที่ ${day}` : 'ค้นหาสถานที่'}
              </DialogTitle>
              <p id="place-search-description" className="text-sm text-gray-600 mt-1">
                ค้นหาสถานที่ที่คุณต้องการเพิ่มในแผนการเดินทาง
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? 'ซ่อน' : 'แสดง'} ตัวกรอง
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type Filter - Collapsible */}
          {showFilters && (
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-sm text-gray-700">กรองตามประเภท</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <Button
                  variant={selectedType === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType('all')}
                  className="justify-start"
                >
                  <span className="mr-2">🔍</span>
                  ทั้งหมด
                </Button>
                <Button
                  variant={selectedType === 'restaurant' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType('restaurant')}
                  className="justify-start"
                >
                  <span className="mr-2">🍽️</span>
                  ร้านอาหาร
                </Button>
                <Button
                  variant={selectedType === 'lodging' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType('lodging')}
                  className="justify-start"
                >
                  <span className="mr-2">🏨</span>
                  โรงแรม
                </Button>
                <Button
                  variant={selectedType === 'tourist_attraction' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType('tourist_attraction')}
                  className="justify-start"
                >
                  <span className="mr-2">🏛️</span>
                  สถานที่ท่องเที่ยว
                </Button>
                <Button
                  variant={selectedType === 'shopping_mall' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedType('shopping_mall')}
                  className="justify-start"
                >
                  <span className="mr-2">🛍️</span>
                  ศูนย์การค้า
                </Button>
              </div>
              {selectedType !== 'all' && (
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    กรอง: {selectedType === 'restaurant' ? 'ร้านอาหาร' : 
                           selectedType === 'lodging' ? 'โรงแรม' :
                           selectedType === 'tourist_attraction' ? 'สถานที่ท่องเที่ยว' :
                           selectedType === 'shopping_mall' ? 'ศูนย์การค้า' : selectedType}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedType('all')}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    ล้าง
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Search Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาสถานที่ที่ต้องการเพิ่ม..."
                onKeyPress={handleKeyPress}
                className="pl-10"
              />
            </div>
            <Button 
              onClick={handleSearch} 
              disabled={loading || !query.trim()}
              className="px-6"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  ค้นหา
                </>
              )}
            </Button>
          </div>

          {/* Search Results */}
          <div className="space-y-3">
            {places.length > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  พบ {places.length} สถานที่
                  {selectedType !== 'all' && (
                    <span className="ml-1 text-blue-600">
                      (กรอง: {selectedType === 'restaurant' ? 'ร้านอาหาร' : 
                               selectedType === 'lodging' ? 'โรงแรม' :
                               selectedType === 'tourist_attraction' ? 'สถานที่ท่องเที่ยว' :
                               selectedType === 'shopping_mall' ? 'ศูนย์การค้า' : selectedType})
                    </span>
                  )}
                </p>
              </div>
            )}
            
            <div className="max-h-96 overflow-y-auto space-y-2">
              {places.length === 0 && !loading && query && (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="mx-auto h-12 w-12 mb-4 text-gray-300" />
                  <p>ไม่พบสถานที่ที่ค้นหา</p>
                  <p className="text-sm">ลองใช้คำค้นหาอื่นหรือเปลี่ยนประเภท</p>
                </div>
              )}

              {places.map((place) => (
                <Card key={place.place_id} className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02] border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start gap-2 mb-2">
                          <h3 className="font-semibold text-sm text-gray-900 flex-1">{place.name}</h3>
                          {place.types && (
                            <Badge variant="outline" className="text-xs">
                              {getPlaceType(place.types)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">{place.formatted_address}</p>
                      
                        {/* Place Info */}
                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                          {place.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 text-yellow-500" />
                              <span>{place.rating}</span>
                              {place.user_ratings_total && (
                                <span>({place.user_ratings_total})</span>
                              )}
                            </div>
                          )}
                          {place.price_level && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              <span>{getPriceLevel(place.price_level)}</span>
                            </div>
                          )}
                          {getOpeningStatus(place.opening_hours) && (
                            <div className={`flex items-center gap-1 ${getOpeningStatusColor(place.opening_hours)}`}>
                              <Clock className="h-3 w-3" />
                              <span>{getOpeningStatus(place.opening_hours)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {place.place_id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`https://www.google.com/maps/place/?q=place_id:${place.place_id}`, '_blank');
                            }}
                            className="h-8 w-8 p-0"
                            title="ดูใน Google Maps"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleSelectPlace(place)}
                          className="h-8"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          เพิ่ม
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <div className="text-blue-600 mt-0.5">💡</div>
                <div>
                  <p className="text-sm text-blue-800 font-medium mb-1">เคล็ดลับการค้นหา</p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• ใช้คำค้นหาที่เฉพาะเจาะจง เช่น "ร้านอาหารไทย กรุงเทพ"</li>
                    <li>• เลือกประเภทสถานที่เพื่อกรองผลลัพธ์</li>
                    <li>• คลิก "ดูใน Google Maps" เพื่อดูรายละเอียดเพิ่มเติม</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlaceSearch;