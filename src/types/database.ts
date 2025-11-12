// Database Types - Matching actual database schema
// Generated from database schema analysis

export interface Trip {
  id: string;
  user_id?: string | null;
  guest_id?: string | null;
  title: string;
  title_en?: string | null;
  description?: string | null;
  description_en?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  budget_max?: number | null;
  budget_min?: number | null;
  status?: string | null;
  currency?: string | null;
  cover_image_url?: string | null;
  is_public?: boolean | null;
  tags?: string[] | null;
  tags_en?: string[] | null;
  metadata?: any | null;
  route_data?: any | null;
  total_distance?: number | null;
  total_duration?: number | null;
  language?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  
  // Computed fields for frontend
  destinations?: Destination[];
}

export interface Destination {
  id: string;
  trip_id: string;
  name: string;
  name_en?: string | null;
  description?: string | null;
  description_en?: string | null;
  order_index: number;
  latitude?: number | null;
  longitude?: number | null;
  duration_minutes?: number | null;
  notes?: string | null;
  notes_en?: string | null;
  place_id?: string | null;
  formatted_address?: string | null;
  place_types?: string[] | null;
  rating?: number | null;
  user_ratings_total?: number | null;
  price_level?: number | null;
  photos?: any | null; // JSONB
  opening_hours?: any | null; // JSONB
  phone_number?: string | null;
  website?: string | null;
  visit_date?: number | null; // INTEGER day number (not DATE)
  visit_time?: string | null; // TIME
  estimated_cost?: number | null;
  recommended_by_ai?: boolean | null;
  ai_reason?: string | null;
  ai_reason_en?: string | null;
  is_favorite?: boolean | null;
  is_visited?: boolean | null;
  user_rating?: number | null;
  language?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  
  // Computed fields for frontend
  visit_duration?: number; // computed from duration_minutes
  place_type?: 'tourist_attraction' | 'lodging' | 'restaurant';
}

export interface ChatMessage {
  id: string;
  trip_id?: string | null;
  user_id?: string | null;
  role: 'user' | 'assistant' | 'system';
  content: string;
  content_en?: string | null;
  session_id?: string | null;
  model?: string | null;
  tokens_used?: number | null;
  intent?: string | null;
  entities?: any | null; // JSONB
  actions?: any | null; // JSONB
  metadata?: any | null; // JSONB
  language?: string | null;
  created_at?: string | null;
}

export interface Profile {
  id: string;
  user_id: string;
  display_name?: string | null;
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  preferences?: any | null; // JSONB
  created_at?: string | null;
  updated_at?: string | null;
}
