// Auth Service - Handle Guest to Owner Migration
import { supabase } from '@/lib/unifiedSupabaseClient';
import { tripService } from './tripService';

export interface User {
  id: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
}

export const authService = {
  // Get current user
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        // This is normal for guest users, don't log as error
        if (error.message.includes('Auth session missing')) {
          return null; // Guest user
        }
        console.error('Error getting user:', error);
        return null;
      }
      
      // Debug: Log user data to help troubleshoot avatar loading
      if (user) {
        console.log('👤 User data loaded:', {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata,
          avatar_url: user.user_metadata?.avatar_url,
          picture: user.user_metadata?.picture,
          display_name: user.user_metadata?.display_name
        });
      }
      
      return user;
    } catch (error) {
      // This is normal for guest users
      return null;
    }
  },

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<User | null> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      // Handle specific error cases
      if (error.message.includes('email_not_confirmed')) {
        throw new Error('กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ');
      } else if (error.message.includes('Invalid login credentials')) {
        throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      } else {
        throw new Error(`เข้าสู่ระบบไม่สำเร็จ: ${error.message}`);
      }
    }

    return data.user;
  },


  // Sign up with email and password
  async signUp(email: string, password: string, displayName?: string): Promise<User | null> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName
        }
      }
    });

    if (error) {
      throw new Error(`สมัครสมาชิกไม่สำเร็จ: ${error.message}`);
    }

    return data.user;
  },

  // Resend confirmation email
  async resendConfirmation(email: string): Promise<void> {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email
    });

    if (error) {
      throw new Error(`ส่งอีเมลยืนยันไม่สำเร็จ: ${error.message}`);
    }
  },

  // Sign in with Google
  async signInWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) {
      throw new Error(`Google Sign In failed: ${error.message}`);
    }
  },

  // Sign in with Facebook
  async signInWithFacebook(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) {
      throw new Error(`Facebook Sign In failed: ${error.message}`);
    }
  },

  // Sign out
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(`Sign out failed: ${error.message}`);
    }
  },

  // Update user profile (display_name, avatar_url, etc.)
  async updateProfile(updates: { display_name?: string; avatar_url?: string }): Promise<{ user?: User; error?: any }> {
    try {
      const { data, error } = await supabase.auth.updateUser({
        data: updates
      });

      if (error) throw error;

      return { user: data.user as User };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { error };
    }
  },

  // Migrate guest trips to authenticated user
  async migrateGuestTrips(guestId: string, userId: string): Promise<void> {
    try {
      console.log(`🔄 Migrating guest trips from ${guestId} to ${userId}`);

      // Get all trips created by guest (using guest_id)
      const { data: guestTrips, error: fetchError } = await supabase
        .from('trips')
        .select('*')
        .eq('guest_id', guestId);

      if (fetchError) {
        throw new Error(`Failed to fetch guest trips: ${fetchError.message}`);
      }

      if (!guestTrips || guestTrips.length === 0) {
        console.log('No guest trips to migrate');
        return;
      }

      // Update trips: guest_id -> user_id
      const { error: updateError } = await supabase
        .from('trips')
        .update({ 
          user_id: userId,
          guest_id: null 
        })
        .eq('guest_id', guestId);

      if (updateError) {
        throw new Error(`Failed to migrate trips: ${updateError.message}`);
      }

      // Update chat messages (using trip_id)
      const tripIds = guestTrips.map(trip => trip.id);
      const { error: chatError } = await supabase
        .from('chat_messages')
        .update({ user_id: userId })
        .in('trip_id', tripIds)
        .is('user_id', null);

      if (chatError) {
        console.warn('Failed to migrate chat messages:', chatError);
      }

      // Update destinations (using trip_id)
      const { error: destError } = await supabase
        .from('destinations')
        .update({ user_id: userId })
        .in('trip_id', tripIds)
        .is('user_id', null);

      if (destError) {
        console.warn('Failed to migrate destinations:', destError);
      }

      // Update chat sessions (if table exists)
      try {
        const { error: sessionError } = await supabase
          .from('chat_messages')
          .update({ user_id: userId })
          .in('trip_id', tripIds)
          .is('user_id', null);

        if (sessionError) {
          console.warn('Failed to migrate chat sessions:', sessionError);
        }
      } catch (error) {
        console.warn('chat_messages table does not exist, skipping migration');
      }

      console.log(`✅ Successfully migrated ${guestTrips.length} trips`);
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  // Generate guest ID for anonymous users
  generateGuestId(): string {
    return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // Get or create guest ID
  getGuestId(): string {
    let guestId = localStorage.getItem('guest_id');
    if (!guestId) {
      guestId = this.generateGuestId();
      localStorage.setItem('guest_id', guestId);
    }
    return guestId;
  },

  // Clear guest ID after successful migration
  clearGuestId(): void {
    localStorage.removeItem('guest_id');
  }
};
