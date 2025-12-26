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
      {/* Desktop Version */}
      <DialogContent className="hidden sm:grid sm:max-w-4xl p-0 gap-0 overflow-hidden sm:rounded-3xl border-none shadow-2xl">
        <div className="grid md:grid-cols-5 h-full">
          {/* Left Column - Image */}
          <div className="md:col-span-2 bg-gray-100 relative h-[200px] md:h-auto">
            <img 
              src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3" 
              alt="Trip" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/10" />
          </div>

          {/* Right Column - Content */}
          <div className="md:col-span-3 p-6 md:p-8 flex flex-col gap-6 relative bg-white">
            <div className="space-y-2 mt-2">
              <h2 className="text-2xl font-bold tracking-tight">
                {language === 'th' ? 'แชร์และรับคำแนะนำสำหรับทริปของคุณ' : 'Share and get Feedback on your trip'}
              </h2>
              <p className="text-muted-foreground">
                {language === 'th' ? 'รับคำแนะนำจากกลุ่มเพื่อนของคุณและปรับปรุงทริปนี้ให้ดียิ่งขึ้น' : 'Get suggestions from your group and refine this trip.'}
              </p>
            </div>

            {/* Social Icons Grid - Desktop */}
            <div className="grid grid-cols-6 gap-4 my-4">
              {socialApps.map((app) => (
                <button
                  key={app.name}
                  onClick={app.action}
                  disabled={isLoading || !shareUrl}
                  className="flex flex-col items-center gap-2 group transition-transform hover:scale-105 active:scale-95"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${app.color} text-white transition-shadow group-hover:shadow-md`}>
                    {app.icon}
                  </div>
                  <span className="text-xs font-medium text-gray-600">{app.name}</span>
                </button>
              ))}
            </div>

            {/* Page Link Section - Desktop */}
            <div className="space-y-2">
              <label className="text-base font-semibold">
                {language === 'th' ? 'ลิงก์หน้าเว็บ' : 'Page Link'}
              </label>
              <div className="flex items-center bg-gray-50 rounded-xl border border-gray-200 p-1 pr-1 focus-within:ring-2 focus-within:ring-black/5 focus-within:border-gray-400 transition-all">
                <div className="flex-1 px-3 py-2 text-sm text-gray-600 truncate font-mono">
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Generating link...
                    </span>
                  ) : (
                    shareUrl || "https://tripster.com/..."
                  )}
                </div>
                <Button 
                  size="icon"
                  variant="ghost"
                  onClick={handleCopyLink}
                  disabled={!shareUrl}
                  className="h-9 w-9 rounded-lg hover:bg-white shadow-sm border border-transparent hover:border-gray-200 transition-all"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-600" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Mobile Version */}
      <DialogContent className="sm:hidden p-0 gap-0 border-none shadow-2xl overflow-hidden">
        <div className="p-5 flex flex-col gap-5 bg-white overflow-hidden">
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

          {/* Copy Link Button - Mobile */}
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
