import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, FileText, Loader2, Check } from "lucide-react";
import { pdfExportService } from "@/services/pdfExportService";
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

  const handleExport = async (exportLanguage: 'th' | 'en') => {
    setIsExporting(true);
    setExportSuccess(false);
    
    try {
      await pdfExportService.downloadPDF(trip, exportLanguage);
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
        onClick={() => setShowDialog(true)}
      >
        <Download className="h-4 w-4 mr-2" />
        {showLabel && (t('export.button') || 'Export PDF')}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
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
                <p>📅 {new Date(trip.start_date).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US')} - {new Date(trip.end_date).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US')}</p>
                <p>📍 {trip.destinations?.length || 0} {language === 'th' ? 'สถานที่' : 'places'}</p>
              </div>
            </div>

            {/* Export Options */}
            <div className="space-y-3">
              <p className="text-sm font-medium">{t('export.selectLanguage')}</p>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => handleExport('th')}
                  disabled={isExporting}
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
                  disabled={isExporting}
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

