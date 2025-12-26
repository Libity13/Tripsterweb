import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Sparkles, MapPin } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';

interface DaySelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSelectDay: (day: number) => void;
  placeName: string;
  totalDays: number;
  recommendedDay?: number;
  recommendationReason?: string;
}

export const DaySelectionDialog = ({
  open,
  onClose,
  onSelectDay,
  placeName,
  totalDays,
  recommendedDay,
  recommendationReason
}: DaySelectionDialogProps) => {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <MapPin className="h-5 w-5 text-blue-600" />
            {t('dialog.daySelection.title')}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {t('dialog.daySelection.description')} <strong className="text-foreground">"{placeName}"</strong> {t('dialog.daySelection.intoPlan')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-3 py-4">
          {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => {
            const isRecommended = day === recommendedDay;
            
            return (
              <Button
                key={day}
                variant={isRecommended ? "default" : "outline"}
                className={`h-16 sm:h-20 flex flex-col items-center justify-center gap-1 relative active:scale-95 transition-transform ${
                  isRecommended ? 'ring-2 ring-blue-400 shadow-lg' : ''
                }`}
                onClick={() => {
                  onSelectDay(day);
                  onClose();
                }}
              >
                <Calendar className={`h-5 w-5 ${isRecommended ? 'text-white' : 'text-blue-600'}`} />
                <span className="font-semibold text-sm sm:text-base">{t('dialog.daySelection.day')} {day}</span>
                
                {/* แสดง Badge "แนะนำ" ถ้ามี */}
                {isRecommended && (
                  <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <Sparkles className="h-3 w-3" />
                    <span className="font-medium">{t('dialog.daySelection.recommend')}</span>
                  </div>
                )}
              </Button>
            );
          })}
        </div>
        
        {/* แสดงเหตุผลถ้ามีคำแนะนำ */}
        {recommendedDay && recommendationReason && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="font-semibold">{t('dialog.daySelection.reason')}</strong>
                <p className="mt-1">{recommendationReason}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-center sm:justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1 sm:flex-none h-11 sm:h-10">
            {t('common.cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

