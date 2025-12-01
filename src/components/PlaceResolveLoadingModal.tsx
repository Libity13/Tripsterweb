import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Loader2, MapPin, Check, X } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useLanguage } from '@/hooks/useLanguage';

interface PlaceResolveLoadingModalProps {
  open: boolean;
  current: number;
  total: number;
  currentPlaceName?: string;
  failedPlaces?: string[];
}

export const PlaceResolveLoadingModal = ({
  open,
  current,
  total,
  currentPlaceName,
  failedPlaces = []
}: PlaceResolveLoadingModalProps) => {
  const { t } = useLanguage();
  const progress = total > 0 ? (current / total) * 100 : 0;
  const successCount = current - failedPlaces.length;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <VisuallyHidden>
          <DialogTitle>{t('modal.placeResolve.title')}</DialogTitle>
          <DialogDescription>
            {t('modal.placeResolve.description')}
          </DialogDescription>
        </VisuallyHidden>

        <div className="space-y-6 py-4">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <MapPin className="h-8 w-8 text-blue-600 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {t('modal.placeResolve.title')}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {t('modal.placeResolve.description')}...
            </p>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                {current} / {total} {t('modal.placeResolve.progress')}
              </span>
              <span className="font-medium text-blue-600">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Current Place */}
          {currentPlaceName && current <= total && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {currentPlaceName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t('modal.placeResolve.searching')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-xs text-gray-600">{t('modal.placeResolve.success')}</p>
                  <p className="text-lg font-semibold text-green-700">
                    {successCount}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <X className="h-4 w-4 text-red-600" />
                <div>
                  <p className="text-xs text-gray-600">{t('modal.placeResolve.failed')}</p>
                  <p className="text-lg font-semibold text-red-700">
                    {failedPlaces.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Failed Places */}
          {failedPlaces.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-medium text-amber-800 mb-2">
                {t('modal.placeResolve.failedList')} ({failedPlaces.length}):
              </p>
              <ul className="text-xs text-amber-700 space-y-1">
                {failedPlaces.map((place, idx) => (
                  <li key={idx} className="truncate">• {place}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Steps */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600">{t('modal.placeResolve.steps')}</p>
            <div className="space-y-1 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <Check className="h-3 w-3 text-green-600" />
                <span>{t('modal.placeResolve.step1')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />
                <span>{t('modal.placeResolve.step2')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full border-2 border-gray-300" />
                <span className="text-gray-400">{t('modal.placeResolve.step3')}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

