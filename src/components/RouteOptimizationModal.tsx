import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, TrendingDown, Navigation, Clock, MapPin, CheckCircle2, X } from 'lucide-react';
import { Destination } from '@/types/database';

interface RouteOptimizationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  dayNumber: number;
  originalRoute: Destination[];
  optimizedRoute: Destination[];
  originalDistance: number;
  optimizedDistance: number;
  savings: {
    distance: number;
    time: number;
    percentage: number;
  };
}

export const RouteOptimizationModal = ({
  open,
  onClose,
  onConfirm,
  dayNumber,
  originalRoute,
  optimizedRoute,
  originalDistance,
  optimizedDistance,
  savings
}: RouteOptimizationModalProps) => {
  const formatTime = (km: number) => {
    const minutes = Math.round((km / 40) * 60);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours} ชม. ${mins} นาที` : `${mins} นาที`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Navigation className="h-5 w-5 text-blue-600" />
            Route Optimization - วันที่ {dayNumber}
          </DialogTitle>
          <DialogDescription>
            เปรียบเทียบเส้นทางเดิมกับเส้นทางที่ปรับให้เหมาะสม
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Savings Summary */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-gray-900">ประหยัดได้</span>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-green-600 text-lg">{savings.distance.toFixed(1)} km</span>
                  {' '}({savings.percentage.toFixed(0)}%) •{' '}
                  <span className="font-medium text-green-600">{savings.time} นาที</span>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-300 text-lg px-3 py-1">
                -{savings.percentage.toFixed(0)}%
              </Badge>
            </div>
          </div>

          {/* Distance & Time Comparison */}
          <div className="grid grid-cols-2 gap-3">
            {/* Before */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-xs text-gray-500 font-medium mb-2">เส้นทางเดิม</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {originalDistance.toFixed(1)} km
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {formatTime(originalDistance)}
                  </span>
                </div>
              </div>
            </div>

            {/* After */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-xs text-blue-600 font-medium mb-2">เส้นทางที่แนะนำ</div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">
                    {optimizedDistance.toFixed(1)} km
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-600">
                    {formatTime(optimizedDistance)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Route Comparison */}
          <div className="space-y-3">
            <div className="text-sm font-semibold text-gray-700">ลำดับการเดินทาง:</div>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Original Route */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-500 mb-2">เดิม:</div>
                {originalRoute.map((dest, index) => (
                  <div key={dest.id} className="flex items-start gap-2 text-sm">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                      {index + 1}
                    </div>
                    <span className="text-gray-700 text-xs leading-relaxed line-clamp-2">
                      {dest.name}
                    </span>
                  </div>
                ))}
              </div>

              {/* Optimized Route */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-blue-600 mb-2">แนะนำ:</div>
                {optimizedRoute.map((dest, index) => {
                  const originalIndex = originalRoute.findIndex(d => d.id === dest.id);
                  const moved = originalIndex !== index;
                  
                  return (
                    <div key={dest.id} className="flex items-start gap-2 text-sm">
                      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                        moved 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <span className={`text-xs leading-relaxed line-clamp-2 ${
                        moved ? 'text-blue-700 font-medium' : 'text-gray-700'
                      }`}>
                        {dest.name}
                      </span>
                      {moved && (
                        <ArrowRight className="h-3 w-3 text-blue-500 flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Info Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700 flex items-start gap-2">
              <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>
                เส้นทางนี้คำนวณจาก Google Directions API โดยคำนึงถึงประเภทสถานที่ 
                (ที่พัก, ร้านอาหาร, สถานที่ท่องเที่ยว) เพื่อให้เหมาะสมกับการเดินทางจริง
              </span>
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 sm:flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            ยกเลิก
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 sm:flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            ใช้เส้นทางนี้
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

