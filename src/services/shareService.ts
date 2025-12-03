// Share Service - Handle trip sharing functionality
import { supabase } from '@/lib/unifiedSupabaseClient';
import { nanoid } from 'nanoid';

export interface ShareInfo {
  share_token: string;
  share_url: string;
  is_public: boolean;
  shared_at: string | null;
}

export const shareService = {
  // Generate a short, URL-friendly share token (8 characters)
  generateShareToken(): string {
    return nanoid(8);
  },

  // Get full share URL
  getShareUrl(token: string): string {
    return `${window.location.origin}/share/${token}`;
  },

  // Share a trip (generate token and make public)
  async shareTrip(tripId: string): Promise<ShareInfo> {
    console.log('🔗 shareService.shareTrip:', tripId);
    
    // Check if already shared
    const { data: existingTrip } = await supabase
      .from('trips')
      .select('share_token, is_public, shared_at')
      .eq('id', tripId)
      .single();
    
    if (existingTrip?.share_token && existingTrip?.is_public) {
      // Already shared, return existing info
      return {
        share_token: existingTrip.share_token,
        share_url: this.getShareUrl(existingTrip.share_token),
        is_public: true,
        shared_at: existingTrip.shared_at,
      };
    }
    
    // Generate new token
    const share_token = existingTrip?.share_token || this.generateShareToken();
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from('trips')
      .update({
        share_token,
        is_public: true,
        shared_at: existingTrip?.shared_at || now,
        updated_at: now,
      })
      .eq('id', tripId);
    
    if (error) {
      console.error('❌ shareService.shareTrip: Error:', error);
      throw new Error(`Failed to share trip: ${error.message}`);
    }
    
    console.log('✅ shareService.shareTrip: Success');
    
    return {
      share_token,
      share_url: this.getShareUrl(share_token),
      is_public: true,
      shared_at: existingTrip?.shared_at || now,
    };
  },

  // Unshare a trip (make private)
  async unshareTrip(tripId: string): Promise<void> {
    console.log('🔒 shareService.unshareTrip:', tripId);
    
    const { error } = await supabase
      .from('trips')
      .update({
        is_public: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tripId);
    
    if (error) {
      console.error('❌ shareService.unshareTrip: Error:', error);
      throw new Error(`Failed to unshare trip: ${error.message}`);
    }
    
    console.log('✅ shareService.unshareTrip: Success');
  },

  // Get trip by share token (for public viewing)
  async getTripByShareToken(token: string): Promise<any | null> {
    console.log('🔍 shareService.getTripByShareToken:', token);
    
    const { data: trip, error } = await supabase
      .from('trips')
      .select(`
        *,
        destinations (*)
      `)
      .eq('share_token', token)
      .eq('is_public', true)
      .single();
    
    if (error) {
      console.error('❌ shareService.getTripByShareToken: Error:', error);
      return null;
    }
    
    console.log('✅ shareService.getTripByShareToken: Found trip');
    return trip;
  },

  // Copy shared trip to user's account
  async copySharedTrip(token: string, userId: string): Promise<string> {
    console.log('📋 shareService.copySharedTrip:', token, userId);
    
    // Get the shared trip
    const sharedTrip = await this.getTripByShareToken(token);
    if (!sharedTrip) {
      throw new Error('Shared trip not found');
    }
    
    // Create a new trip for the user
    const { data: newTrip, error: tripError } = await supabase
      .from('trips')
      .insert([{
        user_id: userId,
        title: `${sharedTrip.title} (Copy)`,
        title_en: sharedTrip.title_en ? `${sharedTrip.title_en} (Copy)` : null,
        description: sharedTrip.description,
        description_en: sharedTrip.description_en,
        start_date: sharedTrip.start_date,
        end_date: sharedTrip.end_date,
        budget_min: sharedTrip.budget_min,
        budget_max: sharedTrip.budget_max,
        status: 'planning',
        language: sharedTrip.language,
      }])
      .select()
      .single();
    
    if (tripError || !newTrip) {
      throw new Error(`Failed to copy trip: ${tripError?.message}`);
    }
    
    // Copy destinations
    if (sharedTrip.destinations && sharedTrip.destinations.length > 0) {
      const newDestinations = sharedTrip.destinations.map((dest: any) => ({
        trip_id: newTrip.id,
        user_id: userId,
        name: dest.name,
        name_en: dest.name_en,
        description: dest.description,
        description_en: dest.description_en,
        latitude: dest.latitude,
        longitude: dest.longitude,
        place_id: dest.place_id,
        formatted_address: dest.formatted_address,
        place_types: dest.place_types,
        rating: dest.rating,
        photos: dest.photos,
        visit_date: dest.visit_date,
        order_index: dest.order_index,
        visit_duration: dest.visit_duration,
        estimated_cost: dest.estimated_cost,
      }));
      
      const { error: destError } = await supabase
        .from('destinations')
        .insert(newDestinations);
      
      if (destError) {
        console.warn('⚠️ Failed to copy some destinations:', destError);
      }
    }
    
    console.log('✅ shareService.copySharedTrip: Success, new trip ID:', newTrip.id);
    return newTrip.id;
  },
};

// Social Share Service
export const socialShareService = {
  // Share to Line
  shareToLine(url: string, title: string) {
    const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
    window.open(lineUrl, '_blank', 'width=600,height=500');
  },

  // Share to Facebook
  shareToFacebook(url: string) {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(fbUrl, '_blank', 'width=600,height=500');
  },

  // Share to X (Twitter)
  shareToX(url: string, text: string) {
    const xUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(xUrl, '_blank', 'width=600,height=500');
  },

  // Share to WhatsApp
  shareToWhatsApp(url: string, text: string) {
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + ' ' + url)}`;
    window.open(whatsappUrl, '_blank', 'width=600,height=500');
  },

  // Share to Messenger (Note: This often requires an App ID for full web functionality, falling back to generic FB share or just UI)
  shareToMessenger(url: string) {
    // Using generic FB share which is often used for Messenger sharing on web without App ID setup
    // Alternatively: fb-messenger://share/?link=${encodeURIComponent(url)} for mobile
    const messengerUrl = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&app_id=291474419146&redirect_uri=${encodeURIComponent(url)}`;
    window.open(messengerUrl, '_blank', 'width=600,height=500');
  },

  // Share to Telegram
  shareToTelegram(url: string, text: string) {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(telegramUrl, '_blank', 'width=600,height=500');
  },

  // Share via Email
  shareViaEmail(url: string, title: string, text: string) {
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text + '\n' + url)}`;
    window.location.href = mailtoUrl;
  },

  // Copy to clipboard
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      } catch {
        document.body.removeChild(textArea);
        return false;
      }
    }
  },

  // Native share (mobile)
  async nativeShare(data: { title: string; text: string; url: string }): Promise<boolean> {
    if (navigator.share) {
      try {
        await navigator.share(data);
        return true;
      } catch (e) {
        // User cancelled or error
        return false;
      }
    }
    return false;
  },

  // Check if native share is available
  isNativeShareAvailable(): boolean {
    return !!navigator.share;
  },
};

export default shareService;

