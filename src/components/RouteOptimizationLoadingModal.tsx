import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Navigation, MapPin, Route } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface RouteOptimizationLoadingModalProps {
  open: boolean;
}

export const RouteOptimizationLoadingModal = ({
  open
}: RouteOptimizationLoadingModalProps) => {
  return (
    <Dialog open={open}>
      <DialogContent 
        className="sm:max-w-md [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Hidden title and description for accessibility */}
        <VisuallyHidden>
          <DialogTitle>กำลังคำนวณเส้นทาง</DialogTitle>
          <DialogDescription>
            กำลังวิเคราะห์เส้นทางที่ดีที่สุดสำหรับคุณ กรุณารอสักครู่
          </DialogDescription>
        </VisuallyHidden>
        
        <div className="flex flex-col items-center justify-center py-8 px-4">
          {/* Animated Icon */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 border-4 border-blue-200 rounded-full animate-pulse"></div>
            </div>
            <div className="relative flex items-center justify-center w-20 h-20">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Navigation className="h-5 w-5 text-blue-600" />
            กำลังคำนวณเส้นทาง
          </h3>

          {/* Description */}
          <div className="space-y-3 text-center">
            <p className="text-sm text-gray-600">
              กำลังวิเคราะห์เส้นทางที่ดีที่สุดสำหรับคุณ...
            </p>
            
            {/* Steps */}
            <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-left">
              <div className="flex items-start gap-2 text-xs text-blue-700">
                <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>คำนวณระยะทางระหว่างสถานที่</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-blue-700">
                <Route className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>เรียก Google Directions API</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-blue-700">
                <Navigation className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>หาเส้นทางที่ประหยัดที่สุด</span>
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="pt-2">
              <div className="flex items-center justify-center gap-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>

            <p className="text-xs text-gray-500 italic">
              กรุณารอสักครู่...
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

