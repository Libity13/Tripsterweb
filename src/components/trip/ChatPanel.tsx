// ChatPanel Component - AI chat interface for trip planning
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, Loader2, Sparkles, MapPin, Clock, DollarSign, User, CheckCircle2 } from 'lucide-react';
import { aiService, applyAIActions, validateAIResponse } from '@/services/aiService';
import { tripService } from '@/services/tripService';
import { databaseSyncService } from '@/services/databaseSyncService';
import { authService } from '@/services/authService';
import { routeOptimizationService } from '@/services/routeOptimizationService';
import { geocodingService } from '@/services/geocodingService';
import { useAIConfig } from '@/config/aiConfig';
import { extractPlacesFromNarrative, searchPlacesForExtractedNames } from '@/services/narrativeExtractionService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { findProvincesInText, getProvinceByAlias } from '@/data/provinces';
import { supabase } from '@/lib/unifiedSupabaseClient';
import { ChatMessage, Destination } from '@/types/database';
import { LocationChangeDialog, LocationChangeChoice } from '@/components/LocationChangeDialog';
import { DaySelectionDialog } from '@/components/DaySelectionDialog';
import { PlaceResolveLoadingModal } from '@/components/PlaceResolveLoadingModal';
import { detectLanguage, type Language } from '@/hooks/useLanguage';

interface ChatPanelProps {
  tripId?: string;
  onDestinationsUpdate?: (destinations: Destination[]) => void;
  onLoginPrompt?: () => void;
  height?: string;
}

const ChatPanel = ({ 
  tripId, 
  onDestinationsUpdate, 
  onLoginPrompt,
  height = '400px' 
}: ChatPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  
  // Two-Step AI Flow: Loading States
  const [aiStep, setAiStep] = useState<'idle' | 'generating' | 'extracting' | 'searching' | 'storing' | 'completed'>('idle');
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStepMessage, setAiStepMessage] = useState('');
  const [travelStyle, setTravelStyle] = useState<string>('');
  const [budget, setBudget] = useState<string>('');
  
  // Geocoding Loading States
  const [showGeocodingModal, setShowGeocodingModal] = useState(false);
  const [geocodingCurrent, setGeocodingCurrent] = useState(0);
  const [geocodingTotal, setGeocodingTotal] = useState(0);
  const [geocodingCurrentPlace, setGeocodingCurrentPlace] = useState('');
  const [geocodingFailedPlaces, setGeocodingFailedPlaces] = useState<string[]>([]);
  const [travelType, setTravelType] = useState<'family' | 'couple' | 'solo' | 'friends'>('couple');
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Location change detection
  const [previousLocation, setPreviousLocation] = useState<string | null>(null);
  const [showLocationChangeDialog, setShowLocationChangeDialog] = useState(false);
  const [pendingActions, setPendingActions] = useState<any[]>([]);
  const [pendingNewLocation, setPendingNewLocation] = useState('');
  
  // Day selection for recommendations
  const [showDaySelection, setShowDaySelection] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<any>(null);
  const [tripDayCount, setTripDayCount] = useState(1);
  const [dayRecommendation, setDayRecommendation] = useState<{
    day: number;
    reason: string;
  } | null>(null);
  
  // Get AI config from context
  const { config: aiConfig, updateProvider, updateModel, getAvailableModels } = useAIConfig();

  // Quick Start Templates
  const quickStartTemplates = [
    {
      title: "🏖️ เที่ยวชายหาด",
      prompt: "วางแผนเที่ยวชายหาด 3 วัน งบ 10,000 บาท",
      icon: "🏖️"
    },
    {
      title: "🏔️ ผจญภัยภูเขา", 
      prompt: "วางแผนเที่ยวภูเขา 2 วัน งบ 5,000 บาท",
      icon: "🏔️"
    },
    {
      title: "🍜 ทัวร์อาหาร",
      prompt: "วางแผนทัวร์อาหาร 1 วัน งบ 2,000 บาท",
      icon: "🍜"
    },
    {
      title: "🏛️ เที่ยววัฒนธรรม",
      prompt: "วางแผนเที่ยววัฒนธรรม 2 วัน งบ 8,000 บาท",
      icon: "🏛️"
    }
  ];

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
        setUser(null);
      }
    };

    loadUser();
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat history if tripId is provided
  useEffect(() => {
    if (tripId) {
      console.log('📱 Loading chat history for trip:', tripId);
      loadChatHistory();
    } else {
      // Welcome message for new trips
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: '👋 สวัสดีครับ! ผมคือ Tripster \n\nบอกผมได้เลยว่าคุณอยากไปเที่ยวที่ไหน กี่วัน แล้วผมจะช่วยวางแผนการเดินทางให้คุณ\n\nตัวอย่างเช่น:\n• "ฉันอยากไปเที่ยวกรุงเทพ 3 วัน"\n• "วางแผนเที่ยวเชียงใหม่ 2 วัน"\n• "แนะนำสถานที่ท่องเที่ยวในภูเก็ต"',
        language: 'th',
        created_at: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
    }
  }, [tripId]);

  // Initialize previousLocation from existing destinations
  useEffect(() => {
    const initializePreviousLocation = async () => {
      if (tripId && !previousLocation) {
        try {
          console.log('🔍 Initializing previousLocation from existing destinations...');
          const destinations = await databaseSyncService.loadDestinations(tripId);
          
          if (destinations.length > 0 && destinations[0].formatted_address) {
            // Extract location from first destination's formatted_address
            const location = destinations[0].formatted_address.split(',').pop()?.trim();
            if (location) {
              console.log(`📍 Initialized previousLocation: ${location}`);
              setPreviousLocation(location);
            }
          }
        } catch (error) {
          console.error('❌ Error initializing previousLocation:', error);
        }
      }
    };

    initializePreviousLocation();
  }, [tripId, previousLocation]);

  // [ลบ] useEffect นี้ซ้ำกับ useEffect ข้างบน
  // useEffect(() => {
  //   if (!tripId) return;
  //   
  //   console.log('🔄 Loading chat history once...');
  //   loadChatHistory();
  // }, [tripId]);

  // Real-time updates using Supabase Realtime
  useEffect(() => {
    if (!tripId) return;
    
    console.log('🔄 Setting up real-time updates for trip:', tripId);
    
    const channel = supabase
      .channel(`trip-${tripId}-chat`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages',
          filter: `trip_id=eq.${tripId}`
        },
        (payload) => {
          console.log('📱 New message received:', payload.new);
          const newMessage: ChatMessage = {
            id: payload.new.id,
            role: payload.new.role,
            content: payload.new.content,
            language: payload.new.language,
            created_at: payload.new.created_at,
            trip_id: payload.new.trip_id,
            user_id: payload.new.user_id
          };
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'chat_messages',
          filter: `trip_id=eq.${tripId}`
        },
        (payload) => {
          console.log('📱 Message updated:', payload.new);
          const updatedMessage: ChatMessage = {
            id: payload.new.id,
            role: payload.new.role,
            content: payload.new.content,
            language: payload.new.language,
            created_at: payload.new.created_at,
            trip_id: payload.new.trip_id,
            user_id: payload.new.user_id
          };
          setMessages(prev => prev.map(msg => 
            msg.id === payload.new.id ? updatedMessage : msg
          ));
        }
      )
      .subscribe();

    return () => {
      console.log('🔄 Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [tripId]);

  const loadChatHistory = async () => {
    try {
      if (!tripId) return;
      
      console.log('📱 Loading chat history for trip:', tripId);
      
      // [วิธีแก้] ตรวจสอบ sessionStorage ก่อน (สำหรับ Race Condition)
      const pendingChatKey = `pending_chat_${tripId}`;
      const pendingMessages = sessionStorage.getItem(pendingChatKey);
      
      if (pendingMessages) {
        console.log('📱 Found pending messages in sessionStorage');
        try {
          const parsedMessages = JSON.parse(pendingMessages);
          setMessages(parsedMessages);
          console.log('✅ Loaded pending messages from sessionStorage:', parsedMessages.length, 'messages');
          // ลบ sessionStorage ทันทีหลังจากใช้
          sessionStorage.removeItem(pendingChatKey);
          return;
        } catch (parseError) {
          console.warn('⚠️ Failed to parse pending messages:', parseError);
          // ลบ sessionStorage ที่เสียหาย
          sessionStorage.removeItem(pendingChatKey);
        }
      }
      
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error loading chat history:', error);
        throw error;
      }
      
      console.log('✅ Chat history loaded:', data?.length || 0, 'messages');
      console.log('📱 Chat messages:', data);
      
      if (data && data.length > 0) {
        setMessages(data as ChatMessage[]);
        console.log('✅ Final messages state from database:', data.length, 'messages');
      } else {
        // If no messages, show personalized welcome message
        const welcomeMessage: ChatMessage = {
          id: 'welcome',
          role: 'assistant',
          content: `👋 สวัสดีครับ! ผมคือ AI Travel Assistant ของคุณ

🎯 ผมจะช่วยคุณวางแผนการเดินทางที่สมบูรณ์แบบ:
• 🏖️ เที่ยวชายหาด - โรแมนติก & ผ่อนคลาย
• 🏔️ ผจญภัยภูเขา - แอดเวนเจอร์ & ธรรมชาติ  
• 🍜 ทัวร์อาหาร - อร่อย & ประสบการณ์ท้องถิ่น
• 🏛️ เที่ยววัฒนธรรม - ประวัติศาสตร์ & ศิลปะ

💡 เลือกเทมเพลตด้านล่าง หรือบอกผมได้เลยว่าคุณอยากไปไหน!`,
          language: 'th',
          created_at: new Date().toISOString()
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('❌ Failed to load chat history:', error);
      // Show welcome message on error
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: '👋 สวัสดีครับ! ผมคือ AI Travel Assistant\n\nบอกผมได้เลยว่าคุณอยากไปเที่ยวที่ไหน กี่วัน แล้วผมจะช่วยวางแผนการเดินทางให้คุณ',
        language: 'th',
        created_at: new Date().toISOString()
      };
      setMessages([welcomeMessage]);
    }
  };

  // Normalize location name for comparison
  const normalizeLocation = (location: string): string => {
    return location
      .replace(/^จังหวัด/, '')  // Remove "จังหวัด" prefix
      .replace(/\s+/g, '')       // Remove spaces
      .toLowerCase()
      .trim();
  };

  // Detect location change in AI actions or user message
  const detectLocationChange = (actions: any[], userMessage: string): boolean => {
    // Try to find location_context from actions
    let newLocation = null;
    
    // Check RECOMMEND_PLACES first
    const recommendAction = actions.find((a: any) => a.action === 'RECOMMEND_PLACES');
    if (recommendAction?.location_context) {
      newLocation = recommendAction.location_context;
    }
    
    // Check ADD_DESTINATIONS if no RECOMMEND_PLACES
    if (!newLocation) {
      const addAction = actions.find((a: any) => a.action === 'ADD_DESTINATIONS');
      if (addAction?.location_context) {
        newLocation = addAction.location_context;
      }
    }
    
    // Fallback: extract from user message
    if (!newLocation && userMessage) {
      const provinces = findProvincesInText(userMessage);
      if (provinces.length > 0) {
        newLocation = provinces[0].name; // Extract name from province object
      }
    }
    
    console.log('🔍 Location Detection:', {
      newLocation,
      previousLocation,
      tripId: !!tripId,
      hasPreviousLocation: !!previousLocation
    });
    
    if (!newLocation) {
      console.log('⚠️ No new location detected');
      return false;
    }

    // If we have a trip but no previous location, set it first
    if (tripId && !previousLocation) {
      console.log(`📍 Setting initial location for existing trip: ${newLocation}`);
      setPreviousLocation(newLocation);
      return false;
    }

    // Check if location changed (with normalization for better matching)
    if (previousLocation && tripId) {
      const normalizedPrevious = normalizeLocation(previousLocation);
      const normalizedNew = normalizeLocation(newLocation);
      
      console.log('🔍 Comparing locations:', {
        previous: previousLocation,
        new: newLocation,
        normalizedPrevious,
        normalizedNew,
        isDifferent: normalizedPrevious !== normalizedNew
      });
      
      if (normalizedPrevious !== normalizedNew) {
        console.log(`🗺️ Location change detected: ${previousLocation} → ${newLocation}`);
        console.log(`   From actions:`, actions.map(a => a.action).join(', '));
        console.log(`   User message:`, userMessage);
        setPendingNewLocation(newLocation);
        return true;
      } else {
        console.log('✅ Same location, no change detected');
      }
    }
    
    // Update previous location if no trip exists yet (first time)
    if (!previousLocation && !tripId) {
      console.log(`📍 Setting initial location (no trip yet): ${newLocation}`);
      setPreviousLocation(newLocation);
    }
    
    return false;
  };

  // Handle location change choice
  const handleLocationChoice = async (choice: 'new-trip' | 'add-location' | 'cancel') => {
    setShowLocationChangeDialog(false);

    if (choice === 'cancel') {
      setPendingActions([]);
      setPendingNewLocation('');
      setLoading(false);
      toast.info('ยกเลิกการเปลี่ยนปลายทาง');
      return;
    }

    if (choice === 'new-trip') {
      // Delete all destinations from current trip before creating new one
      toast.success(`สร้างทริปใหม่: ${pendingNewLocation}`);
      
      try {
        // Delete all destinations
        if (tripId) {
          console.log('🗑️ Deleting all destinations from trip:', tripId);
          const { data: destinations, error: fetchError } = await supabase
            .from('destinations')
            .select('id')
            .eq('trip_id', tripId);
          
          if (fetchError) {
            console.error('Error fetching destinations:', fetchError);
          } else if (destinations && destinations.length > 0) {
            const { error: deleteError } = await supabase
              .from('destinations')
              .delete()
              .eq('trip_id', tripId);
            
            if (deleteError) {
              console.error('Error deleting destinations:', deleteError);
            } else {
              console.log('✅ Deleted all destinations:', destinations.length);
            }
          }
        }
        
        // Update location and reload
        setPreviousLocation(pendingNewLocation);
        
        // Process new actions immediately after clearing
        if (pendingActions.length > 0 && tripId) {
          console.log('📍 Processing new location actions:', pendingActions.length);
          
          // Count total destinations to geocode
          const totalPlaces = pendingActions.reduce((sum, action) => {
            if (action.action === 'ADD_DESTINATIONS' && action.destinations) {
              return sum + action.destinations.length;
            }
            return sum;
          }, 0);
          
          // Show geocoding modal
          setGeocodingTotal(totalPlaces);
          setGeocodingCurrent(0);
          setGeocodingCurrentPlace('');
          setGeocodingFailedPlaces([]);
          setShowGeocodingModal(true);
          
          // Set up progress callbacks
          const onGeocodingProgress = (current: number, total: number, placeName: string) => {
            setGeocodingCurrent(current);
            setGeocodingTotal(total);
            setGeocodingCurrentPlace(placeName);
          };
          
          const onGeocodingFailed = (placeName: string) => {
            setGeocodingFailedPlaces(prev => [...prev, placeName]);
          };
          
          // Sync with progress tracking
          await databaseSyncService.syncAIActions(pendingActions, tripId, {
            onGeocodingProgress,
            onGeocodingFailed
          });
          
          // Hide modal
          setShowGeocodingModal(false);
          
          const newDestinations = await databaseSyncService.loadDestinations(tripId);
          if (onDestinationsUpdate) {
            onDestinationsUpdate(newDestinations);
          }
        }
        
        // Clear pending data
        setPendingActions([]);
        setPendingNewLocation('');
        setLoading(false);
        
        toast.success('สร้างทริปใหม่เรียบร้อย!');
      } catch (error) {
        console.error('Error creating new trip:', error);
        toast.error('เกิดข้อผิดพลาดในการสร้างทริปใหม่');
        setLoading(false);
      }
      return;
    } else if (choice === 'add-location') {
      // Update location (allowing multi-destination)
      setPreviousLocation(`${previousLocation}, ${pendingNewLocation}`);
      
      // Process pending actions with existing trip
      if (pendingActions.length > 0 && tripId) {
        toast.success(`เพิ่ม ${pendingNewLocation} เข้าทริปเดิม`);
        try {
          await databaseSyncService.syncAIActions(pendingActions, tripId);
          const destinations = await databaseSyncService.loadDestinations(tripId);
          if (onDestinationsUpdate) {
            onDestinationsUpdate(destinations);
          }
        } catch (error) {
          console.error('Error processing pending actions:', error);
          toast.error('เกิดข้อผิดพลาดในการเพิ่มสถานที่');
        }
      }
    }

    // Clear pending data
    setPendingActions([]);
    setPendingNewLocation('');
    setLoading(false);
  };

  // Handle undo
  const handleUndo = () => {
    setShowLocationChangeDialog(false);
    setPendingActions([]);
    setPendingNewLocation('');
    setLoading(false);
    toast.info('ยกเลิกการเปลี่ยนปลายทาง');
  };

  const handleSend = async (message: string) => {
    if (!message.trim() || loading) return;

    // Auto-detect language from user message
    const detectedLanguage: Language = detectLanguage(message);
    console.log('🌍 Detected language:', detectedLanguage, 'from message:', message.substring(0, 50));

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      language: detectedLanguage, // Use detected language instead of hardcoded 'th'
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    
    // Reset progress states
    setAiStep('idle');
    setAiProgress(0);
    setAiStepMessage('');

    try {
      console.log('🤖 Sending message to AI:', message);
      
      // Extract day from message for AI context (support both Thai and English)
      const dayMatchTh = message.match(/วันที่(\d+)/);
      const dayMatchEn = message.match(/day\s*(\d+)/i);
      const extractedDay = dayMatchTh ? parseInt(dayMatchTh[1]) : 
                          dayMatchEn ? parseInt(dayMatchEn[1]) : null;
      
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const provider: 'openai' | 'claude' | 'gemini' = 
        aiConfig.currentProvider === 'claude' ? 'claude' : 
        aiConfig.currentProvider === 'gemini' ? 'gemini' : 'openai';
      
      // Get trip data for context - IMPORTANT for AI to know trip duration and existing destinations
      let tripData: { 
        start_date?: string; 
        end_date?: string; 
        total_days?: number; 
        destinations_count?: number;
        existing_destinations?: Array<{ name: string; day: number; place_type?: string }>;
      } = {};
      if (tripId) {
        const trip = await tripService.getTrip(tripId);
        if (trip) {
          const diffTime = new Date(trip.end_date || '').getTime() - new Date(trip.start_date || '').getTime();
          const totalDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
          tripData = {
            start_date: trip.start_date || undefined,
            end_date: trip.end_date || undefined,
            total_days: totalDays,
            destinations_count: trip.destinations?.length || 0,
            // 🆕 ส่งรายชื่อ destinations ที่มีอยู่แล้วให้ AI รู้จัก
            existing_destinations: trip.destinations?.map(d => ({
              name: d.name,
              day: d.visit_date || 1,
              place_type: d.place_type
            })) || []
          };
          console.log('📊 Trip data for AI context:', tripData);
        }
      }
      
      const context = { 
        tripId, 
        history,
        language: detectedLanguage, // Pass detected language to AI
        ...(extractedDay && { day: extractedDay }), // Add day context if found
        // Trip data - CRITICAL for AI to respect trip duration
        ...tripData,
        // Add AI config parameters
        provider,
        model: aiConfig.currentModel,
        mode: 'structured' as const, // Default to structured for now
        temperature: aiConfig.temperature,
        style: 'detailed' as const
      };
      
      console.log('📅 Extracted day from message:', extractedDay);
      console.log('🤖 AI Config:', { provider: context.provider, model: context.model, temperature: context.temperature });
      
      // Step 1: Generate Response (Structured or Narrative)
      setAiStep('generating');
      setAiProgress(10);
      setAiStepMessage('กำลังสร้าง response...');
      
      const response = await aiService.sendMessage(message, context, 'th');
      console.log('🤖 AI Response received:', response);
      
      if (response.success) {
        // Check if response has narrative (Two-Step AI flow)
        if (response.narrative) {
          // Two-Step AI Flow: Step 2 - Extract Places from Narrative
          setAiStep('extracting');
          setAiProgress(40);
          setAiStepMessage('กำลัง extract สถานที่จาก narrative...');
          
          // Get trip info for context
          let tripDays = 1;
          if (tripId) {
            const trip = await tripService.getTrip(tripId);
            if (trip) {
              const diffTime = new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime();
              tripDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
            }
          }
          
          const extractionResult = await extractPlacesFromNarrative(response.narrative, {
            provider,
            model: aiConfig.currentModel,
            temperature: aiConfig.temperature * 0.5, // Lower temperature for extraction
            tripId,
            tripDays
          });
          
          if (extractionResult.success && extractionResult.places.length > 0) {
            // Step 3: Search Google Places
            setAiStep('searching');
            setAiProgress(60);
            setAiStepMessage(`กำลังค้นหา Google Places สำหรับ ${extractionResult.places.length} สถานที่...`);
            
            const placesWithGoogleData = await searchPlacesForExtractedNames(
              extractionResult.places,
              extractionResult.places[0]?.hintAddress
            );
            
            // Step 4: Store Places
            setAiStep('storing');
            setAiProgress(80);
            setAiStepMessage('กำลังบันทึกสถานที่...');
            
            // Convert extracted places to ADD_DESTINATIONS action format
            const addDestinationsAction = {
              action: 'ADD_DESTINATIONS' as const,
              destinations: placesWithGoogleData.map(place => ({
                name: place.name,
                place_id: place.place_id,
                hintAddress: place.hintAddress,
                minHours: place.minHours,
                place_type: place.place_type,
                day: place.day
              })),
              location_context: placesWithGoogleData[0]?.hintAddress
            };
            
            // Process AI actions (store places)
            await processAIActions([addDestinationsAction], tripId);
            
            setAiProgress(100);
            setAiStep('completed');
            setAiStepMessage('เสร็จสิ้น!');
            
            // Create AI message with narrative or reply
            // Priority: narrative > reply > default message
            const aiContent = response.narrative || response.reply || response.message || 'ได้สร้างแผนการเดินทางให้คุณแล้ว กรุณาดูที่แผนที่และรายการสถานที่';
            const aiMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: aiContent,
              language: 'th',
              created_at: new Date().toISOString()
            };
            
            setMessages(prev => [...prev, aiMessage]);
            
            // Save messages to database
            if (tripId && !user) {
              await saveMessageToDatabase(userMessage, tripId);
              await saveMessageToDatabase(aiMessage, tripId);
            }
            
            toast.success(`เพิ่ม ${extractionResult.places.length} สถานที่แล้ว!`);
            
          } else {
            // Extraction failed, fallback to structured response
            console.warn('⚠️ Extraction failed, using structured response');
            setAiStep('completed');
            setAiProgress(100);
            setAiStepMessage('เสร็จสิ้น!');
            
            const validatedResponse = validateAIResponse(response);
            
            if (validatedResponse) {
              // Use reply from validated response, or fallback to response.reply/narrative
            const aiContent = validatedResponse.reply || response.reply || response.narrative || response.message || 'ได้ประมวลผลคำขอของคุณแล้ว';
            
            // Extract recommendations from RECOMMEND_PLACES action
            const recommendAction: any = validatedResponse.actions?.find((a: any) => a.action === 'RECOMMEND_PLACES');
            const recommendations = recommendAction?.recommendations || null;
            
            const aiMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: aiContent,
              language: 'th',
              created_at: new Date().toISOString(),
              actions: validatedResponse.actions, // Store actions
              metadata: recommendations ? { recommendations } : null // Store recommendations
            };
            
            setMessages(prev => [...prev, aiMessage]);
              
              // Save messages to database
              if (tripId && !user) {
                await saveMessageToDatabase(userMessage, tripId);
                await saveMessageToDatabase(aiMessage, tripId);
              }
              
              // Process AI actions
              if (validatedResponse.actions && validatedResponse.actions.length > 0) {
                console.log('🎯 Processing AI actions:', validatedResponse.actions);
                const actionsWithContext = validatedResponse.actions.map(action => ({
                  ...action,
                  ...(extractedDay && { day: extractedDay })
                }));
                await processAIActions(actionsWithContext, tripId);
              }
            }
          }
        } else {
          // Structured Response (Single-Step AI Flow)
          setAiStep('completed');
          setAiProgress(100);
          setAiStepMessage('เสร็จสิ้น!');
          
          // Validate AI response using the new validator
          const validatedResponse = validateAIResponse(response);
          
          if (validatedResponse) {
            // Use reply from validated response, or fallback to response.reply/narrative
            const aiContent = validatedResponse.reply || response.reply || response.narrative || response.message || 'ได้ประมวลผลคำขอของคุณแล้ว';
            
            // Extract recommendations from RECOMMEND_PLACES action
            const recommendAction: any = validatedResponse.actions?.find((a: any) => a.action === 'RECOMMEND_PLACES');
            const recommendations = recommendAction?.recommendations || null;
            
            const aiMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: aiContent,
              language: 'th',
              created_at: new Date().toISOString(),
              actions: validatedResponse.actions, // Store actions
              metadata: recommendations ? { recommendations } : null // Store recommendations
            };

            setMessages(prev => [...prev, aiMessage]);

            // Save messages to database
            if (tripId && !user) {
              await saveMessageToDatabase(userMessage, tripId);
              await saveMessageToDatabase(aiMessage, tripId);
            }

            // Check if AI suggests login
            if (validatedResponse.suggest_login) {
              setShowLoginPrompt(true);
              if (onLoginPrompt) {
                onLoginPrompt();
              }
            }

            // Process AI actions
            if (validatedResponse.actions && validatedResponse.actions.length > 0) {
              console.log('🎯 Processing AI actions:', validatedResponse.actions);
              
              // Check for location change
              if (detectLocationChange(validatedResponse.actions, message)) {
                // Store pending actions and show dialog
                const actionsWithContext = validatedResponse.actions.map(action => ({
                  ...action,
                  ...(extractedDay && { day: extractedDay })
                }));
                setPendingActions(actionsWithContext);
                setShowLocationChangeDialog(true);
                // Don't process actions yet, wait for user choice
                setLoading(false);
                return;
              }
              
              const actionsWithContext = validatedResponse.actions.map(action => ({
                ...action,
                ...(extractedDay && { day: extractedDay })
              }));
              await processAIActions(actionsWithContext, tripId);
              
              // Update previous location after processing actions successfully
              const recommendAction: any = validatedResponse.actions.find((a: any) => a.action === 'RECOMMEND_PLACES');
              const addAction: any = validatedResponse.actions.find((a: any) => a.action === 'ADD_DESTINATIONS');
              const newLocation = recommendAction?.location_context || addAction?.location_context;
              if (newLocation) {
                console.log(`📍 Updating previousLocation to: ${newLocation}`);
                setPreviousLocation(newLocation);
                
                // 🆕 Update trip name based on location
                if (tripId) {
                  await tripService.updateTripNameByLocation(tripId, newLocation);
                }
              }
            }
          } else {
            console.error('❌ AI response validation failed');
            toast.error('เกิดข้อผิดพลาดในการประมวลผลคำตอบจาก AI');
          }
        }
      } else {
        throw new Error('AI service error');
      }
    } catch (error) {
      console.error('AI error:', error);
      toast.error('เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่');
      
      setAiStep('idle');
      setAiProgress(0);
      setAiStepMessage('');
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'ขออภัย เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่',
        language: 'th',
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      // Reset progress after a delay
      setTimeout(() => {
        setAiStep('idle');
        setAiProgress(0);
        setAiStepMessage('');
      }, 2000);
    }
  };

  // Save message to database
  const saveMessageToDatabase = async (message: ChatMessage, tripId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          trip_id: tripId,
          role: message.role,
          content: message.content,
          language: message.language || 'th',
          user_id: null, // Use null for guest users
          created_at: message.created_at || new Date().toISOString(),
          actions: message.actions || null, // Save actions
          metadata: message.metadata || null // Save metadata (recommendations)
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  // Process AI actions
  const processAIActions = async (actions: any[], tripId?: string) => {
    if (!tripId) {
      console.log('⚠️ No tripId provided, skipping database sync');
      return;
    }

    try {
      console.log('🤖 Processing AI actions with database sync:', actions.length, 'actions');
      
      // Sync AI actions to database
      await databaseSyncService.syncAIActions(actions, tripId);
      
      // Reload destinations from database
      const updatedDestinations = await databaseSyncService.loadDestinations(tripId);
      
      if (onDestinationsUpdate) {
        onDestinationsUpdate(updatedDestinations);
        toast.success('อัปเดตแผนการเดินทางแล้ว!');
      }
      
      console.log('✅ AI actions processed successfully');
    } catch (error) {
      console.error('❌ Error processing AI actions:', error);
      toast.error('เกิดข้อผิดพลาดในการประมวลผล AI actions');
    }
  };

  // Add recommendation to trip (with day selection)
  const addRecommendationToTrip = async (recommendation: any, day: number) => {
    if (!tripId) {
      toast.error('กรุณาสร้างทริปก่อน');
      return;
    }

    try {
      setLoading(true);
      console.log(`📍 Adding recommendation "${recommendation.name}" to day ${day}`);
      
      const action = {
        action: 'ADD_DESTINATIONS',
        destinations: [{
          name: recommendation.name,
          place_type: recommendation.type || 'tourist_attraction',
          description: recommendation.description
        }],
        day: day // Specify target day
      };
      
      await processAIActions([action], tripId);
      toast.success(`✅ เพิ่ม ${recommendation.name} เข้าวันที่ ${day} แล้ว`);
    } catch (error) {
      console.error('Error adding recommendation:', error);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มสถานที่');
    } finally {
      setLoading(false);
    }
  };

  // Handle add recommendation button click
  const handleAddRecommendation = async (recommendation: any) => {
    if (!tripId) {
      toast.error('กรุณาสร้างทริปก่อน');
      return;
    }
    
    try {
      // Load current destinations to check day count and location context
      const destinations = await databaseSyncService.loadDestinations(tripId);
      const dayCount = destinations.length > 0
        ? Math.max(...destinations.map(d => d.visit_date || 1))
        : 1;
      
      console.log(`📅 Current trip has ${dayCount} day(s)`);
      
      // Get location context from existing destinations
      const locationContext = destinations.length > 0 && destinations[0].formatted_address
        ? destinations[0].formatted_address.split(',').pop()?.trim()
        : undefined;
      
      // 🔍 Geocode recommendation if it doesn't have coordinates
      if (!recommendation.latitude || !recommendation.longitude) {
        console.log('🔍 Geocoding recommendation:', recommendation.name);
        try {
          const geocodeResult = await geocodingService.geocodeDestination(
            recommendation.name,
            locationContext
          );
          
          if (geocodeResult) {
            recommendation.latitude = geocodeResult.latitude;
            recommendation.longitude = geocodeResult.longitude;
            console.log('✅ Geocoded successfully:', geocodeResult);
          } else {
            console.warn('⚠️ Could not geocode recommendation');
          }
        } catch (error) {
          console.error('❌ Geocoding error:', error);
        }
      }
      
      // Update state for dialog
      setTripDayCount(dayCount);
      
      if (dayCount > 1) {
        // 🚀 Smart Suggestion: Find best day based on proximity
        let suggestedDay: number | null = null;
        let suggestionReason: string = '';
        
        // Check if recommendation has coordinates (from geocoding)
        if (recommendation.latitude && recommendation.longitude) {
          const bestMatch = routeOptimizationService.findBestDayForLocation(
            { 
              latitude: recommendation.latitude, 
              longitude: recommendation.longitude 
            },
            destinations
          );
          
          if (bestMatch) {
            suggestedDay = bestMatch.day;
            suggestionReason = bestMatch.reason;
            
            console.log('✨ Smart suggestion:', bestMatch);
          }
        } else {
          console.log('⚠️ No coordinates available for smart suggestion');
        }
        
        // Set recommendation data
        setDayRecommendation(
          suggestedDay ? { day: suggestedDay, reason: suggestionReason } : null
        );
        
        // Show dialog
        setSelectedRecommendation(recommendation);
        setShowDaySelection(true);
      } else {
        // Single day - add directly
        await addRecommendationToTrip(recommendation, 1);
      }
    } catch (error) {
      console.error('Error handling add recommendation:', error);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มสถานที่');
    }
  };

  // REMOVED: extractDestinationsFromResponse - ไม่ใช้แล้ว เพราะเดาสถานที่ผิด
  // ให้ใช้ databaseSyncService.syncAIActions() แทน เพื่อดึงข้อมูลจาก Google Places จริง

  // REMOVED: createTripFromDestinations - ไม่ใช้แล้ว เพราะเดาสถานที่ผิด
  // ให้ใช้ databaseSyncService.syncAIActions() แทน เพื่อดึงข้อมูลจาก Google Places จริง

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const quickActions = [
    {
      text: 'เพิ่มสถานที่ใหม่',
      prompt: 'กรุณาบอกชื่อสถานที่ที่ต้องการเพิ่มเข้าไปในแผนการเดินทาง',
      icon: '➕'
    },
    {
      text: 'ปรับแก้แผน',
      prompt: 'กรุณาบอกว่าต้องการปรับแก้แผนการเดินทางอย่างไร (เช่น เปลี่ยนวันที่, เพิ่ม/ลดสถานที่)',
      icon: '✏️'
    },
    {
      text: 'คำนวณค่าใช้จ่าย',
      prompt: 'ช่วยคำนวณค่าใช้จ่ายทั้งหมดของทริปนี้ให้หน่อย',
      icon: '💰'
    },
    {
      text: 'แนะนำร้านอาหาร',
      prompt: 'ช่วยแนะนำร้านอาหารในบริเวณนี้ให้หน่อย',
      icon: '🍽️'
    },
    {
      text: 'ลบสถานที่',
      prompt: 'กรุณาบอกชื่อสถานที่ที่ต้องการลบออกจากแผนการเดินทาง',
      icon: '🗑️'
    },
    {
      text: 'จัดเรียงใหม่',
      prompt: 'กรุณาบอกลำดับใหม่ที่ต้องการจัดเรียงสถานที่',
      icon: '🔄'
    }
  ];

  return (
    <>
      {/* Location Change Dialog */}
      <LocationChangeDialog
        open={showLocationChangeDialog}
        oldLocation={previousLocation || ''}
        newLocation={pendingNewLocation}
        onChoice={handleLocationChoice}
        onUndo={handleUndo}
      />
      
      <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="shrink-0">
        <div className="flex items-center justify-between">
          <div>
        <CardTitle className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
            <img src="/TripsterAvatar.png" alt="Tripster AI" className="h-full w-full object-cover" />
          </div>
          Chat with AI
        </CardTitle>
        <p className="text-sm text-gray-600">
          Ask AI to modify your trip or get recommendations
        </p>
          </div>
        </div>
        {/* AI Model Selection Dropdown */}
        <div className="mt-4 space-y-2">
          <Label htmlFor="ai-provider" className="text-xs text-gray-600">AI Model</Label>
          <div className="flex gap-2">
            <Select
              value={aiConfig.currentProvider}
              onValueChange={(value: 'openai' | 'claude' | 'gemini') => updateProvider(value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="claude">Claude</SelectItem>
                <SelectItem value="gemini">Gemini</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={aiConfig.currentModel}
              onValueChange={(value) => updateModel(value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select Model" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableModels().map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-hidden p-0">
        <div className="h-full flex flex-col p-6 pt-0">
          {/* Messages */}
          <div 
            className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-2"
          >
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg ${
                  message.role === 'user' 
                    ? 'bg-blue-500 text-white' 
                    : message.role === 'assistant'
                    ? 'bg-gradient-to-r from-purple-100 to-blue-100 text-gray-900 border border-purple-200'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <div className="flex items-start gap-2">
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-6 h-6 rounded-full overflow-hidden">
                        <img src="/TripsterAvatar.png" alt="Tripster AI" className="w-full h-full object-cover" />
                      </div>
                    )}
                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center">
                        {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
                          <img
                            src={user.user_metadata.avatar_url || user.user_metadata.picture}
                            alt="Profile"
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 bg-gradient-to-br from-cyan-400 to-teal-400 rounded-full flex items-center justify-center">
                            <User className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      
                      {/* Show recommendations if available */}
                      {message.metadata?.recommendations && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-semibold text-gray-700 mb-2">✨ คำแนะนำสถานที่:</p>
                          {message.metadata.recommendations.map((rec: any, idx: number) => (
                            <div 
                              key={idx}
                              className="bg-white p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-sm transition-all"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-purple-500 flex-shrink-0" />
                                    <h4 className="font-semibold text-sm text-gray-900">{rec.name}</h4>
                                  </div>
                                  {rec.description && (
                                    <p className="text-xs text-gray-600 mt-1 ml-6">{rec.description}</p>
                                  )}
                                  <div className="flex items-center gap-2 mt-1 ml-6">
                                    <Badge variant="outline" className="text-xs">
                                      {rec.type === 'tourist_attraction' && '🏛️ สถานที่ท่องเที่ยว'}
                                      {rec.type === 'restaurant' && '🍽️ ร้านอาหาร'}
                                      {rec.type === 'lodging' && '🏨 ที่พัก'}
                                    </Badge>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 px-2 hover:bg-purple-50 hover:border-purple-300"
                                  onClick={() => handleAddRecommendation(rec)}
                                  disabled={loading}
                                >
                                  + เพิ่ม
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.created_at!).toLocaleTimeString('th-TH')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex flex-col gap-3">
                {/* Progress Indicator */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
                  <div className="space-y-3">
                    {/* Step Indicators */}
                    <div className="flex items-center justify-between text-xs">
                      <div className={`flex items-center gap-2 ${aiStep === 'generating' || aiStep === 'extracting' || aiStep === 'searching' || aiStep === 'storing' || aiStep === 'completed' ? 'text-blue-600' : 'text-gray-400'}`}>
                        {aiStep === 'completed' || (aiStep !== 'idle' && aiStep !== 'generating') ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Loader2 className={`h-4 w-4 ${aiStep === 'generating' ? 'animate-spin' : ''}`} />
                        )}
                        <span className="font-medium">Step 1: Generate</span>
                      </div>
                      <div className={`flex items-center gap-2 ${aiStep === 'extracting' || aiStep === 'searching' || aiStep === 'storing' || aiStep === 'completed' ? 'text-blue-600' : 'text-gray-400'}`}>
                        {aiStep === 'completed' || (aiStep !== 'idle' && aiStep !== 'generating' && aiStep !== 'extracting') ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Loader2 className={`h-4 w-4 ${aiStep === 'extracting' ? 'animate-spin' : ''}`} />
                        )}
                        <span className="font-medium">Step 2: Extract</span>
                      </div>
                      <div className={`flex items-center gap-2 ${aiStep === 'searching' || aiStep === 'storing' || aiStep === 'completed' ? 'text-blue-600' : 'text-gray-400'}`}>
                        {aiStep === 'completed' || aiStep === 'storing' ? (
                          aiStep === 'completed' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          )
                        ) : (
                          <Loader2 className={`h-4 w-4 ${aiStep === 'searching' ? 'animate-spin' : ''}`} />
                        )}
                        <span className="font-medium">Step 3: Store</span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <Progress value={aiProgress} className="h-2" />
                    
                    {/* Status Message */}
                    {aiStepMessage && (
                      <p className="text-sm text-gray-700 font-medium">{aiStepMessage}</p>
                    )}
                  </div>
                </div>
                
                {/* Loading Message */}
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-gray-600">
                        {aiStep === 'generating' && 'AI กำลังสร้าง narrative...'}
                        {aiStep === 'extracting' && 'AI กำลัง extract สถานที่...'}
                        {aiStep === 'searching' && 'กำลังค้นหา Google Places...'}
                        {aiStep === 'storing' && 'กำลังบันทึกสถานที่...'}
                        {aiStep === 'completed' && 'เสร็จสิ้น!'}
                        {aiStep === 'idle' && 'AI กำลังคิด...'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Start Templates */}
          {messages.length <= 1 && (
            <div className="space-y-3 mt-auto pt-4 shrink-0">
              <h4 className="text-sm font-medium text-gray-700">🚀 เริ่มต้นง่ายๆ:</h4>
              <div className="grid grid-cols-2 gap-2">
                {quickStartTemplates.map((template, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSend(template.prompt)}
                    className="flex flex-col items-center p-3 h-auto text-xs hover:bg-blue-50 hover:border-blue-300"
                  >
                    <span className="text-lg mb-1">{template.icon}</span>
                    <span className="font-medium">{template.title}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions - Temporarily disabled */}
          {/* {messages.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => (
                <Button
                  key={action.text}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSend(action.prompt)}
                  disabled={loading}
                  className="text-xs flex items-center gap-1"
                >
                  <span>{action.icon}</span>
                  {action.text}
                </Button>
              ))}
            </div>
          )} */}

          {/* Input */}
          <div className="flex space-x-2 mt-4 pt-2 shrink-0">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="ถามเกี่ยวกับแผนการเดินทางของคุณ..."
              onKeyPress={handleKeyPress}
              disabled={loading}
              className="flex-1"
            />
            <Button 
              onClick={() => handleSend(input)}
              disabled={loading || !input.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Login Prompt Modal */}
        {showLoginPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="text-center flex items-center justify-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  🎉 Save Your Trip!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-center text-gray-600">
                  To save this trip and access it later, please sign in
                </p>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">You'll be able to:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>✅ Save and access your trips</li>
                    <li>✅ Share with friends and family</li>
                    <li>✅ Export to PDF</li>
                    <li>✅ Get personalized recommendations</li>
                  </ul>
                </div>
                <div className="flex space-x-2">
                  <Button className="flex-1">
                    Sign In
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setShowLoginPrompt(false)}
                  >
                    Continue as Guest
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Day Selection Dialog */}
    <DaySelectionDialog
      open={showDaySelection}
      onClose={() => {
        setShowDaySelection(false);
        setSelectedRecommendation(null);
        setDayRecommendation(null);
      }}
      onSelectDay={(day) => addRecommendationToTrip(selectedRecommendation, day)}
      placeName={selectedRecommendation?.name || ''}
      totalDays={tripDayCount}
      recommendedDay={dayRecommendation?.day}
      recommendationReason={dayRecommendation?.reason}
    />

    {/* Place Resolve Loading Modal */}
    <PlaceResolveLoadingModal
      open={showGeocodingModal}
      current={geocodingCurrent}
      total={geocodingTotal}
      currentPlaceName={geocodingCurrentPlace}
      failedPlaces={geocodingFailedPlaces}
    />
    </>
  );
};

export default ChatPanel;