import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
      <DialogContent className="sm:max-w-md p-0 gap-0 border-none shadow-2xl overflow-hidden">
        {/* Content */}
        <div className="p-5 sm:p-6 flex flex-col gap-5 bg-white overflow-hidden">
          {/* Header */}
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold tracking-tight">
              {language === 'th' ? '🔗 แชร์ทริป' : '🔗 Share Trip'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {language === 'th' ? 'ส่งให้เพื่อนดูแผนการเดินทาง' : 'Send trip plan to friends'}
            </p>
          </div>

          {/* Social Icons - Horizontal Scroll Only */}
          <div 
            className="flex gap-3 overflow-x-scroll overflow-y-hidden pb-2 -mx-5 px-5 snap-x snap-mandatory touch-pan-x"
            style={{ 
              WebkitOverflowScrolling: 'touch',
              overscrollBehaviorX: 'contain',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {socialApps.map((app) => (
              <button
                key={app.name}
                onClick={app.action}
                disabled={isLoading || !shareUrl}
                className="flex flex-col items-center gap-1.5 group transition-transform hover:scale-105 active:scale-95 flex-shrink-0 snap-center min-w-[60px]"
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm ${app.color} text-white transition-shadow group-hover:shadow-md`}>
                  {React.cloneElement(app.icon as React.ReactElement, { className: 'h-6 w-6 text-white' })}
                </div>
                <span className="text-xs font-medium text-gray-600">{app.name}</span>
              </button>
            ))}
          </div>

          {/* Copy Link Button - Simple on Mobile */}
          <Button 
            size="lg"
            variant={copied ? "default" : "outline"}
            onClick={handleCopyLink}
            disabled={!shareUrl || isLoading}
            className={`w-full h-12 rounded-xl transition-all text-base font-medium ${
              copied 
                ? 'bg-green-500 hover:bg-green-600 text-white' 
                : 'border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                {language === 'th' ? 'กำลังสร้างลิงก์...' : 'Generating...'}
              </>
            ) : copied ? (
              <>
                <Check className="h-5 w-5 mr-2" />
                {language === 'th' ? 'คัดลอกแล้ว!' : 'Copied!'}
              </>
            ) : (
              <>
                <Copy className="h-5 w-5 mr-2" />
                {language === 'th' ? 'คัดลอกลิงก์' : 'Copy Link'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShareDialog;
