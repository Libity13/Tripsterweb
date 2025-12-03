import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Download, FileText, Loader2, Check, Settings2 } from "lucide-react";
import { pdfExportService, ExportOptions } from "@/services/pdfExportService";
import { Trip } from "@/types/database";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";

interface ExportPDFButtonProps {
  trip: Trip;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export function ExportPDFButton({ 
  trip, 
  variant = 'outline', 
  size = 'sm',
  showLabel = true 
}: ExportPDFButtonProps) {
  const { language, t } = useLanguage();
  const [isExporting, setIsExporting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  
  // Export options state
  const [includeCover, setIncludeCover] = useState(true);
  const [includeBudget, setIncludeBudget] = useState(true);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);

  // Calculate trip days
  const tripDays = useMemo(() => {
    if (!trip.start_date || !trip.end_date) return 1;
    return Math.ceil(
      (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
  }, [trip.start_date, trip.end_date]);

  // Initialize selected days when dialog opens
  const handleOpenDialog = () => {
    setSelectedDays(Array.from({ length: tripDays }, (_, i) => i + 1));
    setShowDialog(true);
  };

  // Toggle day selection
  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    );
  };

  // Select/Deselect all days
  const toggleAllDays = () => {
    if (selectedDays.length === tripDays) {
      setSelectedDays([]);
    } else {
      setSelectedDays(Array.from({ length: tripDays }, (_, i) => i + 1));
    }
  };

  const handleExport = async (exportLanguage: 'th' | 'en') => {
    if (selectedDays.length === 0) {
      toast.error(language === 'th' ? 'กรุณาเลือกอย่างน้อย 1 วัน' : 'Please select at least 1 day');
      return;
    }

    setIsExporting(true);
    setExportSuccess(false);
    
    try {
      // Generate share URL - always generate QR Code
      let shareUrl: string | undefined;
      if (trip.is_public && trip.share_token) {
        // Use public share link if available
        shareUrl = `${window.location.origin}/share/${trip.share_token}`;
      } else if (trip.id) {
        // Fallback to trip page URL (for trip owner)
        shareUrl = `${window.location.origin}/trip/${trip.id}`;
      }

      const options: ExportOptions = {
        includeCover,
        includeBudget,
        selectedDays: selectedDays.length === tripDays ? undefined : selectedDays, // undefined = all days
        shareUrl, // For QR Code
      };
      
      await pdfExportService.downloadPDF(trip, exportLanguage, options);
      setExportSuccess(true);
      toast.success(t('export.success'));
      
      // Close dialog after short delay
      setTimeout(() => {
        setShowDialog(false);
        setExportSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('export.error'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Button 
        variant={variant} 
        size={size}
        onClick={handleOpenDialog}
      >
        <Download className="h-4 w-4 mr-2" />
        {showLabel && (t('export.button') || 'Export PDF')}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('export.title')}
            </DialogTitle>
            <DialogDescription>
              {t('export.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Trip Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">{trip.title}</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>📅 {new Date(trip.start_date || '').toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US')} - {new Date(trip.end_date || '').toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US')}</p>
                <p>📍 {trip.destinations?.length || 0} {language === 'th' ? 'สถานที่' : 'places'}</p>
              </div>
            </div>

            {/* Advanced Options Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={() => setShowOptions(!showOptions)}
            >
              <Settings2 className="h-4 w-4 mr-2" />
              {language === 'th' ? 'ตัวเลือกขั้นสูง' : 'Advanced Options'}
              <span className="ml-auto">{showOptions ? '▲' : '▼'}</span>
            </Button>

            {/* Export Options (Collapsible) */}
            {showOptions && (
              <div className="space-y-4 border rounded-lg p-4 bg-slate-50">
                {/* Include Options */}
                <div className="space-y-3">
                  <p className="text-sm font-medium">{language === 'th' ? 'รวมในไฟล์ PDF' : 'Include in PDF'}</p>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="includeCover" 
                      checked={includeCover}
                      onCheckedChange={(checked) => setIncludeCover(checked === true)}
                    />
                    <Label htmlFor="includeCover" className="text-sm cursor-pointer">
                      📄 {language === 'th' ? 'หน้าปก' : 'Cover Page'}
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="includeBudget" 
                      checked={includeBudget}
                      onCheckedChange={(checked) => setIncludeBudget(checked === true)}
                    />
                    <Label htmlFor="includeBudget" className="text-sm cursor-pointer">
                      💰 {language === 'th' ? 'หน้าสรุปงบประมาณ' : 'Budget Summary'}
                    </Label>
                  </div>
                </div>

                <Separator />

                {/* Day Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{language === 'th' ? 'เลือกวัน' : 'Select Days'}</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={toggleAllDays}
                      className="h-auto py-1 px-2 text-xs"
                    >
                      {selectedDays.length === tripDays 
                        ? (language === 'th' ? 'ยกเลิกทั้งหมด' : 'Deselect All')
                        : (language === 'th' ? 'เลือกทั้งหมด' : 'Select All')
                      }
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: tripDays }, (_, i) => i + 1).map(day => (
                      <div 
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`
                          flex items-center justify-center p-2 rounded-md border cursor-pointer text-sm
                          transition-colors
                          ${selectedDays.includes(day) 
                            ? 'bg-primary text-primary-foreground border-primary' 
                            : 'bg-white hover:bg-slate-100 border-slate-200'
                          }
                        `}
                      >
                        {language === 'th' ? `วัน ${day}` : `Day ${day}`}
                      </div>
                    ))}
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    {language === 'th' 
                      ? `เลือก ${selectedDays.length} จาก ${tripDays} วัน` 
                      : `${selectedDays.length} of ${tripDays} days selected`
                    }
                  </p>
                </div>
              </div>
            )}

            <Separator />

            {/* Export Language Options */}
            <div className="space-y-3">
              <p className="text-sm font-medium">{t('export.selectLanguage')}</p>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => handleExport('th')}
                  disabled={isExporting || selectedDays.length === 0}
                >
                  {isExporting && exportSuccess ? (
                    <Check className="h-6 w-6 text-green-600" />
                  ) : isExporting ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <span className="text-2xl">🇹🇭</span>
                  )}
                  <span className="font-medium">ภาษาไทย</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => handleExport('en')}
                  disabled={isExporting || selectedDays.length === 0}
                >
                  {isExporting && exportSuccess ? (
                    <Check className="h-6 w-6 text-green-600" />
                  ) : isExporting ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <span className="text-2xl">🇬🇧</span>
                  )}
                  <span className="font-medium">English</span>
                </Button>
              </div>
            </div>

            {/* Info */}
            <p className="text-xs text-muted-foreground text-center">
              {t('export.info')}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ExportPDFButton;

