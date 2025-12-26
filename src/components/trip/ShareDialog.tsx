import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Copy, 
  Check, 
  Facebook, 
  Mail,
  Send,
  MessageCircle,
  Loader2,
  X
} from "lucide-react";
import { shareService, socialShareService } from "@/services/shareService";
import { useLanguage } from "@/hooks/useLanguage";
import { toast } from "sonner";

// X (Twitter) icon
const XIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="white">
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
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && tripId) {
      initializeShare();
    }
  }, [isOpen, tripId]);

  const initializeShare = async () => {
    setIsLoading(true);
    try {
      // Check/Create share link immediately when opening
      const shareInfo = await shareService.shareTrip(tripId);
      setShareUrl(shareInfo.share_url);
    } catch (error) {
      console.error("Share initialization error:", error);
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

  const socialApps = [
    {
      name: "WhatsApp",
      icon: <MessageCircle className="h-6 w-6 text-white" />, // WhatsApp icon is phone-like but MessageCircle is close for chat apps in lucide
      color: "bg-[#25D366]",
      action: () => socialShareService.shareToWhatsApp(shareUrl, tripTitle)
    },
    {
      name: "Facebook",
      icon: <Facebook className="h-6 w-6 text-white" />,
      color: "bg-[#1877F2]",
      action: () => socialShareService.shareToFacebook(shareUrl)
    },
    {
      name: "X",
      icon: <XIcon />,
      color: "bg-black",
      action: () => socialShareService.shareToX(shareUrl, tripTitle)
    },
    {
      name: "Messenger",
      icon: <MessageCircle className="h-6 w-6 text-white" />,
      color: "bg-gradient-to-b from-[#00B2FF] to-[#006AFF]", // Messenger gradient
      action: () => socialShareService.shareToMessenger(shareUrl)
    },
    {
      name: "Telegram",
      icon: <Send className="h-6 w-6 text-white" />,
      color: "bg-[#229ED9]",
      action: () => socialShareService.shareToTelegram(shareUrl, tripTitle)
    },
    {
      name: "Email",
      icon: <Mail className="h-6 w-6 text-white" />,
      color: "bg-[#7E7E7E]",
      action: () => socialShareService.shareViaEmail(shareUrl, tripTitle, t('share.emailBody'))
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden border-none shadow-2xl">
        {/* Content */}
        <div className="p-5 sm:p-6 flex flex-col gap-5 bg-white">
          {/* Header */}
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold tracking-tight">
              {language === 'th' ? '🔗 แชร์ทริป' : '🔗 Share Trip'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {language === 'th' ? 'ส่งให้เพื่อนดูแผนการเดินทาง' : 'Send trip plan to friends'}
            </p>
          </div>

          {/* Social Icons Grid - 6 columns on all sizes */}
          <div className="grid grid-cols-6 gap-2">
            {socialApps.map((app) => (
              <button
                key={app.name}
                onClick={app.action}
                disabled={isLoading || !shareUrl}
                className="flex flex-col items-center gap-1.5 group transition-transform hover:scale-105 active:scale-95"
              >
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-sm ${app.color} text-white transition-shadow group-hover:shadow-md`}>
                  {React.cloneElement(app.icon as React.ReactElement, { className: 'h-5 w-5 sm:h-6 sm:w-6 text-white' })}
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-gray-600 truncate w-full text-center">{app.name}</span>
              </button>
            ))}
          </div>

          {/* Page Link Section */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              {language === 'th' ? 'ลิงก์' : 'Link'}
            </Label>
            <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200 p-1 gap-1">
              <div className="flex-1 px-3 py-2 text-xs sm:text-sm text-gray-600 truncate font-mono">
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {language === 'th' ? 'กำลังสร้าง...' : 'Loading...'}
                  </span>
                ) : (
                  shareUrl || "https://..."
                )}
              </div>
              <Button 
                size="sm"
                variant={copied ? "default" : "outline"}
                onClick={handleCopyLink}
                disabled={!shareUrl}
                className={`h-9 px-3 rounded-lg transition-all ${copied ? 'bg-green-500 hover:bg-green-600' : ''}`}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    <span className="text-xs">{language === 'th' ? 'คัดลอกแล้ว!' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    <span className="text-xs">{language === 'th' ? 'คัดลอก' : 'Copy'}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShareDialog;
