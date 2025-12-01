import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Copy, 
  Check, 
  Link as LinkIcon, 
  Facebook, 
  MessageCircle,
  Share2,
  Loader2,
  Globe,
  Lock
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { shareService, socialShareService } from "@/services/shareService";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";

// X (Twitter) icon
const XIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripTitle: string;
}

export function ShareDialog({ isOpen, onClose, tripId, tripTitle }: ShareDialogProps) {
  const { t, language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && tripId) {
      loadShareStatus();
    }
  }, [isOpen, tripId]);

  const loadShareStatus = async () => {
    // For now, we'll just set initial state
    // In a real app, we'd check if the trip is already shared
    setIsShared(false);
    setShareUrl("");
  };

  const handleToggleShare = async (enabled: boolean) => {
    setIsLoading(true);
    try {
      if (enabled) {
        const shareInfo = await shareService.shareTrip(tripId);
        setShareUrl(shareInfo.share_url);
        setIsShared(true);
        toast.success(t('share.enabled'));
      } else {
        await shareService.unshareTrip(tripId);
        setIsShared(false);
        setShareUrl("");
        toast.success(t('share.disabled'));
      }
    } catch (error) {
      console.error("Share toggle error:", error);
      toast.error(t('share.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    
    const success = await socialShareService.copyToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      toast.success(t('share.copied'));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (!shareUrl) return;
    
    const success = await socialShareService.nativeShare({
      title: tripTitle,
      text: language === 'th' 
        ? `ดูแผนการเดินทาง: ${tripTitle}` 
        : `Check out this trip: ${tripTitle}`,
      url: shareUrl,
    });
    
    if (!success && !socialShareService.isNativeShareAvailable()) {
      handleCopyLink();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            {t('share.title')}
          </DialogTitle>
          <DialogDescription>
            {t('share.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Share Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {isShared ? (
                <Globe className="h-5 w-5 text-green-600" />
              ) : (
                <Lock className="h-5 w-5 text-gray-500" />
              )}
              <div>
                <Label htmlFor="share-toggle" className="font-medium">
                  {t('share.publicLink')}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isShared ? t('share.publicDesc') : t('share.privateDesc')}
                </p>
              </div>
            </div>
            <Switch
              id="share-toggle"
              checked={isShared}
              onCheckedChange={handleToggleShare}
              disabled={isLoading}
            />
          </div>

          {/* Share Content - Only show when shared */}
          {isShared && shareUrl && (
            <>
              {/* QR Code */}
              <div className="flex flex-col items-center gap-4 p-4 bg-white border rounded-lg">
                <QRCodeSVG 
                  value={shareUrl} 
                  size={150}
                  level="M"
                  includeMargin
                />
                <p className="text-xs text-muted-foreground text-center">
                  {t('share.scanQR')}
                </p>
              </div>

              {/* Share URL */}
              <div className="flex gap-2">
                <Input 
                  value={shareUrl} 
                  readOnly 
                  className="bg-gray-50"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Social Share Buttons */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('share.shareVia')}</Label>
                <div className="flex gap-2 flex-wrap">
                  {/* Native Share (Mobile) */}
                  {socialShareService.isNativeShareAvailable() && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNativeShare}
                      className="flex-1"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      {t('share.share')}
                    </Button>
                  )}
                  
                  {/* Line */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => socialShareService.shareToLine(shareUrl, tripTitle)}
                    className="flex-1 hover:bg-green-50 hover:border-green-500"
                  >
                    <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
                    Line
                  </Button>
                  
                  {/* Facebook */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => socialShareService.shareToFacebook(shareUrl)}
                    className="flex-1 hover:bg-blue-50 hover:border-blue-500"
                  >
                    <Facebook className="h-4 w-4 mr-2 text-blue-600" />
                    Facebook
                  </Button>
                  
                  {/* X (Twitter) */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => socialShareService.shareToX(
                      shareUrl, 
                      language === 'th' 
                        ? `ดูแผนการเดินทางของฉัน: ${tripTitle}` 
                        : `Check out my trip plan: ${tripTitle}`
                    )}
                    className="flex-1 hover:bg-gray-100 hover:border-gray-500"
                  >
                    <XIcon />
                    <span className="ml-2">X</span>
                  </Button>
                </div>
              </div>

              {/* Copy Link Button (Big) */}
              <Button 
                onClick={handleCopyLink} 
                className="w-full"
                variant="default"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    {t('share.copied')}
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-4 w-4 mr-2" />
                    {t('share.copyLink')}
                  </>
                )}
              </Button>
            </>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShareDialog;

