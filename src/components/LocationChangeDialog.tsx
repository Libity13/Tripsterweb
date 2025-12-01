import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, Sparkles, MapPin, Undo2 } from 'lucide-react';
import { useState } from 'react';

export type LocationChangeChoice = 'new-trip' | 'add-location' | 'cancel';

interface LocationChangeDialogProps {
  open: boolean;
  oldLocation: string;
  newLocation: string;
  onChoice: (choice: LocationChangeChoice) => void;
  onUndo: () => void;
}

import { useLanguage } from '@/hooks/useLanguage';

export const LocationChangeDialog = ({
  open,
  oldLocation,
  newLocation,
  onChoice,
  onUndo
}: LocationChangeDialogProps) => {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<LocationChangeChoice>('new-trip');

  const handleClose = () => {
    onChoice('cancel');
  };

  const handleConfirm = () => {
    onChoice(selected);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-blue-500" />
            {t('dialog.locationChange.title')}
          </DialogTitle>
          <DialogDescription>
            {t('dialog.locationChange.description')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Location Change Display */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{t('dialog.locationChange.from')}</span>
              <span className="font-semibold text-gray-900">{oldLocation}</span>
            </div>
            <div className="flex items-center justify-center my-2">
              <ArrowDown className="h-5 w-5 text-blue-500 animate-bounce" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{t('dialog.locationChange.to')}</span>
              <span className="font-semibold text-blue-600 text-lg">{newLocation}</span>
            </div>
          </div>

          {/* Options */}
          <RadioGroup 
            value={selected} 
            onValueChange={(value) => setSelected(value as LocationChangeChoice)}
          >
            <div className="space-y-3">
              {/* Option 1: New Trip */}
              <label 
                className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selected === 'new-trip' 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <RadioGroupItem value="new-trip" id="new-trip" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    <Label htmlFor="new-trip" className="font-semibold cursor-pointer">
                      {t('dialog.locationChange.newTrip')}
                    </Label>
                    <Badge variant="default" className="bg-gradient-to-r from-blue-500 to-purple-500">
                      {t('dialog.locationChange.recommend')}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    {t('dialog.locationChange.newTripDesc')} {newLocation}
                  </p>
                </div>
              </label>

              {/* Option 2: Add Location */}
              <label 
                className={`flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selected === 'add-location' 
                    ? 'border-purple-500 bg-purple-50 shadow-md' 
                    : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                }`}
              >
                <RadioGroupItem value="add-location" id="add-location" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-purple-500" />
                    <Label htmlFor="add-location" className="font-semibold cursor-pointer">
                      {t('dialog.locationChange.addLocation')}
                    </Label>
                    <Badge variant="outline" className="border-purple-500 text-purple-700">
                      {t('dialog.locationChange.multiDest')}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    {t('dialog.locationChange.addLocationDesc')}
                  </p>
                </div>
              </label>
            </div>
          </RadioGroup>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onUndo}
              className="flex-1 hover:bg-gray-100"
            >
              <Undo2 className="h-4 w-4 mr-2" />
              {t('dialog.locationChange.undo')}
            </Button>
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 hover:bg-gray-100"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
            >
              {t('dialog.locationChange.confirm')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

