// Chat Interface - Real AI Integration with Multi-language Support
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, Loader2, MapPin, Calendar, Star } from 'lucide-react';
import { aiService, applyAIActions, validateAIResponse } from '@/services/aiService';
import { databaseSyncService } from '@/services/databaseSyncService';
import { useAIConfig } from '@/config/aiConfig';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { findProvincesInText } from '@/data/provinces';
import { useLanguage, LanguageSwitcher } from '@/hooks/useLanguage';
import { tripService } from '@/services/tripService';
import { supabase } from '@/lib/unifiedSupabaseClient';
import { ChatMessage, Destination } from '@/types/database';
import { toast } from 'sonner';

const Chat = () => {
  const { language, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [suggestedPlaces, setSuggestedPlaces] = useState<any[]>([]);
  const [tripId, setTripId] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<string>('idle'); // Add AI status state
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Get AI config from context
  const { config: aiConfig, updateProvider, updateModel, getAvailableModels } = useAIConfig();

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle initial message from landing page
  useEffect(() => {
    const initialMessage = location.state?.initialMessage;
    if (initialMessage && messages.length === 0) {
      setInput(initialMessage);
      // Auto-send the initial message
      setTimeout(() => {
        handleSend(initialMessage);
      }, 500);
    }
  }, [location.state]);

  const handleSend = async (message: string) => {
    if (!message.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      language: language,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setAiStatus('analyzing'); // Set AI status to analyzing

    // Save user message to database if tripId exists
    if (tripId) {
      await saveMessageToDatabase(userMessage, tripId);
    }

    try {
      // Include current user message in history
      const history = [...messages, userMessage].map(m => ({ role: m.role, content: m.content }));
      console.log('📝 Sending to AI with history:', history.length, 'messages');
      
      // Add AI config parameters
      const provider: 'openai' | 'claude' | 'gemini' = 
        aiConfig.currentProvider === 'claude' ? 'claude' : 
        aiConfig.currentProvider === 'gemini' ? 'gemini' : 'openai';
      
      const context = {
        tripId,
        history,
        provider,
        model: aiConfig.currentModel,
        mode: 'structured' as const, // Default to structured for now
        temperature: aiConfig.temperature,
        style: 'detailed' as const
      };
      
      console.log('🤖 AI Config:', { provider: context.provider, model: context.model, temperature: context.temperature });
      const response = await aiService.sendMessage(message, context, language);
      
      if (response.success) {
        // Validate AI response using the new validator
        const validatedResponse = validateAIResponse(response);
        
        if (validatedResponse) {
          // Use reply from validated response, or fallback to response.reply/narrative
          const aiContent = validatedResponse.reply || response.reply || response.narrative || response.message || 'ได้ประมวลผลคำขอของคุณแล้ว';
          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: aiContent,
            language: language,
            created_at: new Date().toISOString()
          };

          setMessages(prev => [...prev, aiMessage]);
          
          // Save AI message to database if tripId exists
          if (tripId) {
            await saveMessageToDatabase(aiMessage, tripId);
          }

          // Check if AI suggests login
          if (validatedResponse.suggest_login) {
            setShowLoginPrompt(true);
            setShowLoginModal(true);
          }

          // Process AI actions
          if (validatedResponse.actions && validatedResponse.actions.length > 0) {
            console.log('🎯 Processing AI actions:', validatedResponse.actions);
            setAiStatus('processing'); // Set AI status to processing
            // Pass both user message and AI reply to help intent/day extraction
            const combinedContext = `${message} ${validatedResponse.reply || ''}`.trim();
            await processAIActions(validatedResponse.actions, combinedContext);
            setAiStatus('completed'); // Set AI status to completed
          } else {
            setAiStatus('idle'); // Set AI status back to idle
          }
        } else {
          // Fallback to original response if validation fails
          // Use narrative, reply, or message in priority order
          const aiContent = response.narrative || response.reply || response.message || 'ได้ประมวลผลคำขอของคุณแล้ว';
          const aiMessage: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: aiContent,
            language: language,
            created_at: new Date().toISOString()
          };

          setMessages(prev => [...prev, aiMessage]);
          
          // Save fallback AI message to database if tripId exists
          if (tripId) {
            await saveMessageToDatabase(aiMessage, tripId);
          }

          // Check if AI suggests login
          if (response.suggest_login) {
            setShowLoginPrompt(true);
            setShowLoginModal(true);
          }

          // Process AI actions
          if (response.actions && response.actions.length > 0) {
            console.log('🎯 Processing AI actions:', response.actions);
            await processAIActions(response.actions, message);
          }
        }
      } else {
        throw new Error('AI service error');
      }
    } catch (error) {
      console.error('AI error:', error);
      toast.error('เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่');
      setAiStatus('idle'); // Reset AI status on error
      
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
    }
  };

  // Handle adding suggested place to trip
  const handleAddSuggestedPlaceToTrip = async (place: any) => {
    try {
      console.log('➕ Adding suggested place to trip:', place);
      
      // Check if we have a trip ID
      if (!tripId) {
        // Create new trip first
        console.log('🚀 Creating new trip for suggested place');
        const newTrip = await tripService.createTrip({
          title: `แผนการเดินทาง ${place.suggested_type === 'restaurant' ? 'ร้านอาหาร' : 
                           place.suggested_type === 'lodging' ? 'ที่พัก' : 
                           place.suggested_type === 'tourist_attraction' ? 'สถานที่ท่องเที่ยว' : 'ใหม่'}`,
          title_en: `Travel Plan`,
          description: `แผนการเดินทางที่สร้างจาก AI Chat`,
          description_en: `Travel plan created from AI Chat`,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          language: 'th'
        });
        
        console.log('✅ New trip created:', newTrip.id);
        
        // Add destination to new trip
        await tripService.addDestination(newTrip.id, {
          trip_id: newTrip.id,
          name: place.name,
          name_en: place.name,
          description: place.description,
          description_en: place.description,
          latitude: place.latitude,
          longitude: place.longitude,
          rating: place.rating,
          visit_duration: 60,
          estimated_cost: place.price_level ? place.price_level * 100 : 100,
          place_types: place.place_types,
          photos: place.photos,
          place_id: place.place_id,
          formatted_address: place.formatted_address,
          opening_hours: place.opening_hours,
          price_level: place.price_level,
          user_ratings_total: place.user_ratings_total,
          order_index: 1,
          visit_date: 1
        });
        
        // Navigate to trip planner
        navigate(`/trip/${newTrip.id}`);
        toast.success(`เพิ่ม ${place.name} ในแผนการเดินทางแล้ว!`);
      } else {
        // Add to existing trip
        // Choose visit_date = max(current visit_date) or 1 if none
        let visitDay = 1;
        try {
          const { data: existing, error: existingErr } = await supabase
            .from('destinations')
            .select('visit_date')
            .eq('trip_id', tripId);
          if (!existingErr && existing && existing.length > 0) {
            const maxDay = existing.reduce((m: number, d: any) => Math.max(m, Number(d.visit_date) || 1), 1);
            visitDay = maxDay;
          }
        } catch (_) {}

        await tripService.addDestination(tripId, {
          trip_id: tripId,
          name: place.name,
          name_en: place.name,
          description: place.description,
          description_en: place.description,
          latitude: place.latitude,
          longitude: place.longitude,
          rating: place.rating,
          visit_duration: 60,
          estimated_cost: place.price_level ? place.price_level * 100 : 100,
          place_types: place.place_types,
          photos: place.photos,
          place_id: place.place_id,
          formatted_address: place.formatted_address,
          opening_hours: place.opening_hours,
          price_level: place.price_level,
          user_ratings_total: place.user_ratings_total,
          order_index: 1,
          visit_date: visitDay
        });
        
        toast.success(`เพิ่ม ${place.name} ในแผนการเดินทางแล้ว!`);
      }
    } catch (error) {
      console.error('Error adding suggested place:', error);
      toast.error('เกิดข้อผิดพลาดในการเพิ่มสถานที่');
    }
  };

  // Handle removing destinations
  const handleRemoveDestinations = async (destinationNames: string[]) => {
    try {
      console.log('🗑️ Removing destinations:', destinationNames);
      
      if (!tripId) {
        console.warn('⚠️ No trip ID available for removal');
        toast.error('ไม่พบข้อมูลทริป');
        return;
      }

      // Get current destinations for the trip
      const { data: destinations, error: destinationsError } = await supabase
        .from('destinations')
        .select('*')
        .eq('trip_id', tripId);

      if (destinationsError || !destinations) {
        console.error('❌ Error fetching destinations:', destinationsError);
        toast.error('ไม่สามารถดึงข้อมูลสถานที่ได้');
        return;
      }

      // Find destinations to remove by name
      const destinationsToRemove = destinations.filter((dest: any) => 
        destinationNames.some(name => dest.name.includes(name) || name.includes(dest.name))
      );

      if (destinationsToRemove.length === 0) {
        console.warn('⚠️ No matching destinations found for removal');
        toast.error('ไม่พบสถานที่ที่ต้องการลบ');
        return;
      }

      // Remove destinations from database
      const { error: deleteError } = await supabase
        .from('destinations')
        .delete()
        .in('id', destinationsToRemove.map(dest => dest.id));

      if (deleteError) {
        console.error('❌ Error removing destinations:', deleteError);
        toast.error('เกิดข้อผิดพลาดในการลบสถานที่');
        return;
      }

      console.log('✅ Successfully removed destinations:', destinationsToRemove.map(d => d.name));
      toast.success(`ลบสถานที่แล้ว: ${destinationsToRemove.map(d => d.name).join(', ')}`);

      // Refresh the page to show updated trip
      window.location.reload();

    } catch (error) {
      console.error('❌ Error in handleRemoveDestinations:', error);
      toast.error('เกิดข้อผิดพลาดในการลบสถานที่');
    }
  };

  // Handle place recommendations
  const handleRecommendPlaces = async (recommendations: any[], locationContext: string, placeTypes: string[]) => {
    try {
      console.log('🏪 Processing place recommendations:', { recommendations, locationContext, placeTypes });
      
      const suggestedPlaces: any[] = [];
      
      for (const rec of recommendations) {
        try {
          // Search for real coordinates using Google Places
          const searchQuery = `${rec.name}, ${locationContext}`;
          
          const { data: placesData, error: placesError } = await supabase.functions.invoke('google-places', {
            body: {
              type: 'textsearch',
              q: searchQuery,
              language: 'th',
              region: 'th',
              params: {
                type: rec.type,
                fields: 'place_id,geometry,formatted_address,name,photos,rating,user_ratings_total,types,opening_hours,price_level'
              }
            }
          });

          if (placesError) {
            console.warn(`⚠️ Google Places error for ${rec.name}:`, placesError);
            continue;
          }

          if (placesData && placesData.results && placesData.results.length > 0) {
            const place = placesData.results[0];
            const suggestedPlace = {
              id: `suggested-${Date.now()}-${Math.random()}`,
              name: place.name,
              name_en: place.name,
              description: place.formatted_address,
              description_en: place.formatted_address,
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng,
              rating: place.rating || 4.0,
              user_ratings_total: place.user_ratings_total,
              price_level: place.price_level,
              place_types: [rec.type],
              photos: place.photos?.map((photo: any) => photo.photo_reference) || [],
              place_id: place.place_id,
              formatted_address: place.formatted_address,
              opening_hours: place.opening_hours,
              suggested_type: rec.type,
              suggested_description: rec.description
            };
            
            suggestedPlaces.push(suggestedPlace);
            console.log(`✅ Found place: ${rec.name}`, suggestedPlace);
          } else {
            console.warn(`⚠️ No coordinates found for ${rec.name}`);
          }
        } catch (error) {
          console.error(`❌ Error searching coordinates for ${rec.name}:`, error);
        }
      }
      
      // Store suggested places in state
      setSuggestedPlaces(suggestedPlaces);
      console.log('🏪 Suggested places stored:', suggestedPlaces);
      
    } catch (error) {
      console.error('❌ Error processing recommendations:', error);
    }
  };

  // Process AI actions using the new resolver
  const processAIActions = async (actions: any[], currentMessage?: string) => {
    try {
      console.log('🤖 Processing AI actions with new resolver:', actions);
      setAiStatus('creating_trip'); // Set AI status to creating trip
      
      let currentTripId = tripId;
      
      if (!currentTripId) {
        console.log('🆕 No trip ID available, creating new trip...');
        
        // Extract trip duration from user messages
        let tripDuration = 2; // Default 2 days
        const allMessages = [...messages, ...(currentMessage ? [{ role: 'user', content: currentMessage }] : [])];
        const messageText = allMessages.map(m => m.content).join(' ');
        
        // Look for duration patterns
        const durationMatch = messageText.match(/(\d+)\s*วัน/);
        if (durationMatch) {
          tripDuration = parseInt(durationMatch[1]);
          console.log('📅 Extracted trip duration:', tripDuration, 'days');
        }
        
        // Calculate end date based on duration
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + tripDuration * 24 * 60 * 60 * 1000);
        
        // Create a new trip for the user - let AI determine the duration
        const newTrip = await tripService.createTrip({
          title: 'ทริปใหม่',
          description: 'ทริปที่สร้างจาก AI Chat',
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0], // Use calculated duration
          budget_max: 10000,
          budget_min: 1000
        });
        
        currentTripId = newTrip.id;
        setTripId(currentTripId);
        
        console.log('✅ New trip created:', currentTripId);
        
        // Don't navigate immediately - wait for AI to finish planning
        console.log('⏳ Trip created, waiting for AI to finish planning...');
      }

      // Use the new AI service resolver
      setAiStatus('adding_destinations'); // Set AI status to adding destinations
      await applyAIActions(currentTripId, { actions });
      
      console.log('✅ AI actions processed successfully');
      setAiStatus('completed'); // Set AI status to completed
      
      // Reload the trip to show updated data
      const updatedTrip = await tripService.getTrip(currentTripId);
      if (updatedTrip) {
        console.log('🔄 Trip data reloaded');
        
        // Only navigate if AI has added destinations (finished planning)
        const hasDestinations = updatedTrip.destinations && updatedTrip.destinations.length > 0;
        const hasAddDestinationsAction = actions.some(action => action.action === 'ADD_DESTINATIONS');

        if (hasDestinations || hasAddDestinationsAction) {
          console.log('🧭 AI finished planning, navigating to TripPlanner with trip ID:', currentTripId);
          navigate(`/trip/${currentTripId}`);
          toast.success('สร้างแผนการเดินทางแล้ว! กำลังนำคุณไปยังหน้าแผนการเดินทาง...');
        } else {
          console.log('⏳ AI still planning, staying in Chat for more interaction...');
        }
      }
      
    } catch (error) {
      console.error('❌ Error processing AI actions:', error);
      toast.error('เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่');
    }
  };

  // Save message to database
  const saveMessageToDatabase = async (message: ChatMessage, tripId: string) => {
    try {
      console.log('💾 Saving message to database:', message.content);
      
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          trip_id: tripId,
          role: message.role,
          content: message.content,
          language: message.language || 'th',
          user_id: null // Use null instead of string for guest users
        } as any);

      if (error) {
        console.error('❌ Error saving message:', error);
      } else {
        console.log('✅ Message saved to database');
      }
    } catch (error) {
      console.error('❌ Error in saveMessageToDatabase:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  // Handle login success
  const handleLoginSuccess = () => {
    console.log('🎉 Login successful! Refreshing page...');
    setShowLoginModal(false);
    setShowLoginPrompt(false);
    // Refresh the page to update the UI
    window.location.reload();
  };

  // Handle skip login
  const handleSkipLogin = () => {
    console.log('⏭️ Skipping login, continuing as guest...');
    setShowLoginModal(false);
    setShowLoginPrompt(false);
  };

  // Extract destinations from AI response using AI analysis
  const extractDestinationsFromResponse = async (response: string): Promise<Destination[]> => {
    console.log('🔍 extractDestinationsFromResponse called with:', response);
    console.log('🔍 Response type:', typeof response);
    console.log('🔍 Response length:', response.length);
    
    try {
      // Use AI to analyze and extract destinations
      const analysisPrompt = `Extract tourist destinations from this travel itinerary. Return ONLY place names, one per line.

Itinerary: ${response}

Extract these types of places:
- Beaches (หาด, ชายหาด)
- Islands (เกาะ)
- Temples (วัด)
- Markets (ตลาด)
- Shopping centers (ศูนย์การค้า)
- Streets (ถนน)
- Parks (สวน)
- Attractions (สถานที่ท่องเที่ยว)

Examples:
- หาดพัทยา
- เกาะล้าน
- ตลาดน้ำ 4 ภาค
- สวนสนุกการ์ตูนเน็ตเวิร์ค
- เซ็นทรัลเฟสติวัลพัทยา
- Walking Street

Return only place names, one per line:`;

      const analysisResponse = await aiService.sendMessage(analysisPrompt, { tripId }, 'th');
      
      if (analysisResponse.success) {
        const extractedText = analysisResponse.message;
        console.log('🤖 AI analysis response:', extractedText);
        const placeNames = extractedText
          .split('\n')
          .map(line => line.trim())
          .filter(line => {
            // Filter out empty lines, day markers, and non-place text
            return line.length > 0 && 
                   !line.includes('วัน') && 
                   !line.includes('**') && 
                   !line.includes('ผมพบ') &&
                   !line.includes('สถานที่') &&
                   !line.includes('Google Places') &&
                   !line.includes('Extract') &&
                   !line.includes('Instructions') &&
                   !line.includes('Examples') &&
                   !line.includes('Return') &&
                   !line.includes('Itinerary') &&
                   !line.includes('Instructions:') &&
                   !line.includes('Examples of') &&
                   !line.includes('Return only') &&
                   !line.includes('ครับ') &&
                   !line.includes('ค่ะ') &&
                   line.length > 2 && // Must be at least 3 characters
                   !line.startsWith('-') && // Remove bullet points
                   !line.match(/^\d+\./); // Remove numbered lists
          })
          .map(line => line.replace(/^[-•]\s*/, '')) // Remove bullet points
          .slice(0, 15); // Limit to 15 destinations

        console.log('🤖 AI extracted places:', placeNames);

        const foundDestinations: Destination[] = placeNames.map((placeName, index) => ({
          id: `ai-extracted-${placeName.replace(/\s+/g, '-')}-${Date.now()}`,
          trip_id: tripId || '',
          name: placeName,
          name_en: placeName,
          description: `สถานที่ท่องเที่ยวที่แนะนำ`,
          description_en: `Recommended tourist attraction`,
          latitude: null,
          longitude: null,
          rating: 4.0 + Math.random() * 1.0,
          visit_duration: Math.round(60 + Math.random() * 120),
          estimated_cost: Math.round(100 + Math.random() * 500),
          place_types: ['tourist_attraction'],
          photos: [],
          order_index: index + 1
        }));

        console.log('🔍 Found destinations:', foundDestinations);
        return foundDestinations;
      }
    } catch (error) {
      console.error('❌ AI analysis failed:', error);
    }

    // Fallback: try simple keyword extraction
    console.log('❌ AI analysis failed, trying fallback extraction...');
    
    const fallbackKeywords = [
      'หาดพัทยา', 'พัทยา', 'เกาะล้าน', 'ตลาดน้ำ', 'การ์ตูนเน็ตเวิร์ค', 
      'เซ็นทรัลเฟสติวัล', 'Walking Street', 'ชิบูย่า', 'ฮาราจูกุ', 
      'โตเกียวสกายทรี', 'วัดเซ็นโซจิ', 'อาซากุสะ', 'อุเอโนะ', 'ชินจูกุ'
    ];
    
    const foundDestinations: Destination[] = [];
    
    fallbackKeywords.forEach(keyword => {
      if (response.includes(keyword)) {
        console.log('✅ Found fallback keyword:', keyword);
        const destination: Destination = {
          id: `fallback-${keyword}-${Date.now()}`,
          trip_id: tripId || '',
          name: keyword,
          name_en: keyword,
          description: `สถานที่ท่องเที่ยวที่แนะนำ`,
          description_en: `Recommended tourist attraction`,
          latitude: null,
          longitude: null,
          rating: 4.0 + Math.random() * 1.0,
          visit_duration: Math.round(60 + Math.random() * 120),
          estimated_cost: Math.round(100 + Math.random() * 500),
          place_types: ['tourist_attraction'],
          photos: [],
          order_index: foundDestinations.length + 1
        };
        foundDestinations.push(destination);
      }
    });
    
    console.log('🔍 Fallback destinations:', foundDestinations);
    return foundDestinations;
  };

  // Create trip from destinations
  const createTripFromDestinations = async (destinations: any[], targetDay?: number) => {
    try {
      console.log('🚀 Creating trip with destinations:', destinations);
      
      // [แก้ไข] วิเคราะห์จำนวนวันที่จากข้อความผู้ใช้ - ใช้ข้อความแรกก่อน
      const analyzeDaysFromMessage = (messages: ChatMessage[]): number => {
        const userMessages = messages.filter(m => m.role === 'user');
        
        // [สำคัญ] ใช้ข้อความแรกของผู้ใช้ (ไม่ใช่ข้อความล่าสุด)
        const firstMessage = userMessages[0]?.content || '';
        console.log('🔍 Analyzing days from first message:', firstMessage);
        
        // ค้นหาจำนวนวันที่ในข้อความแรก
        const dayPatterns = [
          /(\d+)\s*วัน/,
          /(\d+)\s*คืน/,
          /(\d+)\s*วัน\s*(\d+)\s*คืน/,
          /(\d+)\s*day/i,
          /(\d+)\s*night/i
        ];
        
        for (const pattern of dayPatterns) {
          const match = firstMessage.match(pattern);
          if (match) {
            const days = parseInt(match[1]);
            console.log('🔍 Found days in first message:', days);
            return Math.max(1, days);
          }
        }
        
        // [Fallback] คำนวณจากจำนวนสถานที่ (ประมาณ 2-3 สถานที่ต่อวัน)
        const estimatedDays = Math.max(1, Math.ceil(destinations.length / 3));
        console.log('🔍 Estimated days from destinations (fallback):', estimatedDays);
        return estimatedDays;
      };
      
      const tripDays = analyzeDaysFromMessage(messages);
      console.log('📅 Trip will be created for', tripDays, 'days');
      console.log('🔍 Messages for analysis:', messages.map(m => ({ role: m.role, content: m.content })));
      
      // Convert AI destinations to our format with real coordinates
      const convertedDestinations: Destination[] = [];
      
      for (let index = 0; index < destinations.length; index++) {
        const dest = destinations[index];
        console.log(`🔍 Searching real coordinates for: ${dest.name}`);
        
        try {
          // Search for real coordinates using Google Places (ปรับปรุงคำค้นหา)
          let searchQuery = dest.name;
          
          // ใช้ hintAddress ถ้ามี
          if (dest.hintAddress) {
            searchQuery = `${dest.name}, ${dest.hintAddress}`;
          } else {
            // เพิ่มจังหวัดสำหรับสถานที่เฉพาะตาม place_type
            if (dest.place_type === 'lodging') {
              // ที่พัก - เพิ่มจังหวัดที่ชัดเจน
              if (dest.name.includes('กาญจนบุรี')) {
                searchQuery = `${dest.name}, กาญจนบุรี`;
              } else if (dest.name.includes('เชียงราย')) {
                searchQuery = `${dest.name}, เชียงราย`;
              } else if (dest.name.includes('เชียงใหม่')) {
                searchQuery = `${dest.name}, เชียงใหม่`;
              } else if (dest.name.includes('กรุงเทพ')) {
                searchQuery = `${dest.name}, กรุงเทพ`;
              } else {
                searchQuery = `${dest.name}, ประเทศไทย`;
              }
            } else if (dest.place_type === 'restaurant') {
              // ร้านอาหาร - เพิ่มจังหวัดที่ชัดเจน
              if (dest.name.includes('กาญจนบุรี')) {
                searchQuery = `${dest.name}, กาญจนบุรี`;
              } else if (dest.name.includes('เชียงราย')) {
                searchQuery = `${dest.name}, เชียงราย`;
              } else if (dest.name.includes('เชียงใหม่')) {
                searchQuery = `${dest.name}, เชียงใหม่`;
              } else if (dest.name.includes('กรุงเทพ')) {
                searchQuery = `${dest.name}, กรุงเทพ`;
              } else {
                searchQuery = `${dest.name}, ประเทศไทย`;
              }
            } else {
              // สถานที่ท่องเที่ยว - เพิ่มจังหวัดสำหรับสถานที่เฉพาะ
              if (dest.name.includes('วัดร่องขุ่น')) {
                searchQuery = `${dest.name}, เชียงราย`;
              } else if (dest.name.includes('ดอยแม่สลอง')) {
                searchQuery = `${dest.name}, เชียงราย`;
              } else if (dest.name.includes('สะพานข้ามแม่น้ำแคว')) {
                searchQuery = `${dest.name}, กาญจนบุรี`;
              } else if (dest.name.includes('อุทยานแห่งชาติเอราวัณ')) {
                searchQuery = `${dest.name}, กาญจนบุรี`;
              } else if (dest.name.includes('น้ำตกเอราวัณ')) {
                searchQuery = `${dest.name}, กาญจนบุรี`;
              } else if (dest.name.includes('วัด') || dest.name.includes('ดอย') || dest.name.includes('อุทยาน')) {
                searchQuery = `${dest.name}, ประเทศไทย`;
              } else if (dest.name.includes('ขอนแก่น') || dest.name.includes('วัดหนองแวง') || dest.name.includes('ตลาดต้นตาล')) {
                searchQuery = `${dest.name}, ขอนแก่น`;
              } else if (dest.name.includes('เชียงใหม่') || dest.name.includes('ดอยสุเทพ') || dest.name.includes('วัดพระธาตุดอยสุเทพ')) {
                searchQuery = `${dest.name}, เชียงใหม่`;
              } else if (dest.name.includes('ภูเก็ต') || dest.name.includes('หาดป่าตอง')) {
                searchQuery = `${dest.name}, ภูเก็ต`;
              } else if (dest.name.includes('กรุงเทพ') || dest.name.includes('วัดโพธิ์') || dest.name.includes('วัดพระแก้ว')) {
                searchQuery = `${dest.name}, กรุงเทพ`;
              } else {
                // ถ้าไม่มีคำใบ้ ให้ลองเพิ่ม "ประเทศไทย" เพื่อให้ค้นหาเจอ
                searchQuery = `${dest.name}, ประเทศไทย`;
              }
            }
          }
            
          // ลองค้นหาหลายแบบเพื่อเพิ่มโอกาสในการเจอ
          let placesData = null;
          let placesError = null;
          
          // ลองค้นหาแบบ tourist_attraction ก่อน
          const searchResult1 = await supabase.functions.invoke('google-places', {
            body: {
              type: 'textsearch',
              q: searchQuery,
              language: 'th',
              region: 'th',
              params: {
                type: 'tourist_attraction',
                fields: 'place_id,geometry,formatted_address,name,photos,rating,user_ratings_total,types'
              }
            }
          });
          
          if (searchResult1.data && searchResult1.data.results && searchResult1.data.results.length > 0) {
            placesData = searchResult1.data;
          } else {
            // ถ้าไม่เจอ ลองค้นหาแบบทั่วไป (ไม่ระบุ type)
            const searchResult2 = await supabase.functions.invoke('google-places', {
              body: {
                type: 'textsearch',
                q: searchQuery,
                language: 'th',
                region: 'th',
                params: {
                  fields: 'place_id,geometry,formatted_address,name,photos,rating,user_ratings_total,types'
                }
              }
            });
            
            if (searchResult2.data && searchResult2.data.results && searchResult2.data.results.length > 0) {
              placesData = searchResult2.data;
            } else {
              placesError = searchResult2.error;
            }
          }

          if (placesError) {
            console.warn(`⚠️ Google Places error for ${dest.name}:`, placesError);
          }

          let latitude: number | null = null; // No default coordinates
          let longitude: number | null = null;
          let rating = 4.0;
          let formatted_address = dest.hintAddress || 'สถานที่ท่องเที่ยว';

          let place_id = '';
          let photos: string[] = [];
          let price_level = 0;
          let user_ratings_total = 0;
          let opening_hours = null;

          if (placesData && placesData.results && placesData.results.length > 0) {
            const place = placesData.results[0];
            latitude = place.geometry.location.lat;
            longitude = place.geometry.location.lng;
            rating = place.rating || 4.0;
            formatted_address = place.formatted_address;
            place_id = place.place_id || '';
            photos = place.photos?.map((photo: any) => photo.photo_reference) || [];
            price_level = place.price_level || 0;
            user_ratings_total = place.user_ratings_total || 0;
            opening_hours = place.opening_hours || null;
            console.log(`✅ Found real coordinates for ${dest.name}:`, { 
              latitude, 
              longitude, 
              place_id,
              rating,
              formatted_address 
            });
          } else {
            console.warn(`⚠️ No coordinates found for ${dest.name}, coordinates will be null`);
          }

          convertedDestinations.push({
            id: `ai-${Date.now()}-${index}`,
            trip_id: tripId || '',
            name: dest.name,
            name_en: dest.name,
            description: formatted_address,
            description_en: formatted_address,
            latitude,
            longitude,
            rating: Math.round(rating * 10) / 10,
            visit_duration: Math.round(dest.minHours ? dest.minHours * 60 : 60 + Math.random() * 120),
            estimated_cost: Math.round(100 + Math.random() * 500),
            place_types: dest.place_type ? [dest.place_type] : ['tourist_attraction'],
            place_type: dest.place_type || 'tourist_attraction',
            photos,
            order_index: targetDay ? (targetDay - 1) * 1000 + index + 1 : index + 1,
            // [เพิ่ม] บันทึกข้อมูลสำคัญที่ขาดหายไป
            place_id,
            formatted_address,
            price_level,
            user_ratings_total,
            opening_hours
          });
        } catch (error) {
          console.error(`❌ Error searching coordinates for ${dest.name}:`, error);
          // Fallback to null coordinates (no default Bangkok)
          convertedDestinations.push({
            id: `ai-${Date.now()}-${index}`,
            trip_id: tripId || '',
            name: dest.name,
            name_en: dest.name,
            description: dest.hintAddress || 'สถานที่ท่องเที่ยว',
            description_en: dest.hintAddress || 'Tourist attraction',
            latitude: null,
            longitude: null,
            rating: 4.0,
            visit_duration: Math.round(dest.minHours ? dest.minHours * 60 : 60 + Math.random() * 120),
            estimated_cost: Math.round(100 + Math.random() * 500),
            place_types: dest.place_type ? [dest.place_type] : ['tourist_attraction'],
            place_type: dest.place_type || 'tourist_attraction',
            photos: [],
            order_index: targetDay ? (targetDay - 1) * 1000 + index + 1 : index + 1,
            // [เพิ่ม] ข้อมูลพื้นฐานสำหรับ fallback
            place_id: '',
            formatted_address: dest.hintAddress || 'สถานที่ท่องเที่ยว',
            price_level: 0,
            user_ratings_total: 0,
            opening_hours: null
          });
        }
      }
      
      // [แก้ไข] คำนวณวันที่เริ่มต้นและสิ้นสุดตามจำนวนวันที่ที่วิเคราะห์ได้
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + (tripDays - 1) * 24 * 60 * 60 * 1000);
      
      console.log('📅 Trip dates:', {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        days: tripDays
      });

      const newTrip = await tripService.createTrip({
        title: `แผนการเดินทาง ${tripDays} วัน`,
        title_en: `${tripDays} Day Travel Plan`,
        description: `แผนการเดินทาง ${tripDays} วันที่สร้างจาก AI Chat`,
        description_en: `${tripDays} day travel plan created from AI Chat`,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        language: 'th'
      });

      console.log('✅ Trip created:', newTrip);

      // Save chat messages to database (wait for completion)
      try {
        console.log('💬 Saving chat messages to database...');
        for (const message of messages) {
          await supabase.from('chat_messages').insert({
            trip_id: newTrip.id,
            role: message.role,
            content: message.content,
            created_at: message.created_at || new Date().toISOString()
          } as any);
        }
        console.log('✅ Chat messages saved to database');
      } catch (error) {
        console.error('❌ Failed to save chat messages:', error);
      }

      // [เพิ่ม] จัดกลุ่มสถานที่ตามวัน
      const groupDestinationsByDay = (destinations: Destination[], days: number): Destination[][] => {
        const destinationsPerDay = Math.ceil(destinations.length / days);
        const grouped: Destination[][] = [];
        
        for (let day = 0; day < days; day++) {
          const startIndex = day * destinationsPerDay;
          const endIndex = Math.min(startIndex + destinationsPerDay, destinations.length);
          const dayDestinations = destinations.slice(startIndex, endIndex);
          
          // อัปเดต order_index สำหรับแต่ละวัน
          dayDestinations.forEach((dest, index) => {
            dest.order_index = startIndex + index + 1;
          });
          
          grouped.push(dayDestinations);
          console.log(`📅 Day ${day + 1}: ${dayDestinations.length} destinations`);
        }
        
        return grouped;
      };
      
      const groupedDestinations = groupDestinationsByDay(convertedDestinations, tripDays);
      
      // Add destinations to the trip (wait for completion)
      if (convertedDestinations.length > 0) {
        try {
          console.log('📍 Adding destinations to trip:', convertedDestinations);
          for (const destination of convertedDestinations) {
            await tripService.addDestination(newTrip.id, destination);
          }
          console.log('✅ Destinations added to trip');
        } catch (error) {
          console.error('❌ Failed to add destinations:', error);
        }
      }

      // [วิธีแก้] บันทึก chat messages ลง sessionStorage สำหรับ Race Condition
      const pendingChatKey = `pending_chat_${newTrip.id}`;
      sessionStorage.setItem(pendingChatKey, JSON.stringify(messages));
      console.log('💾 Saved chat messages to sessionStorage for race condition handling');

      // Wait a bit more to ensure all database operations are complete
      console.log('⏳ Waiting for database operations to complete...');
      await new Promise(resolve => setTimeout(resolve, 2500)); // เพิ่มจาก 1 วินาที เป็น 2.5 วินาที

      // Navigate to the new trip (only after everything is saved)
      const navigationPath = `/trip/${newTrip.id}`;
      console.log('🧭 Navigating to:', navigationPath);
      
      try {
        navigate(navigationPath);
        console.log('✅ Navigation called successfully');
      } catch (navError) {
        console.error('❌ Navigation error:', navError);
        window.location.href = navigationPath;
      }
      
      toast.success('สร้างแผนการเดินทางใหม่แล้ว!');
    } catch (error) {
      console.error('❌ Error creating trip:', error);
      toast.error('เกิดข้อผิดพลาดในการสร้างแผนการเดินทาง');
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="h-[700px] flex flex-col">
            <CardHeader className="border-b">
              <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    AI Travel Assistant
                  </CardTitle>
                  <p className="text-sm text-gray-600">
                    Tell me where you want to go and I'll help you plan the perfect itinerary!
                  </p>
                </div>
                  <div className="flex items-center gap-2">
                  {tripId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/trip/${tripId}`)}
                      className="flex items-center gap-2"
                    >
                      <MapPin className="h-4 w-4" />
                      ดูแผนการเดินทาง
                    </Button>
                  )}
                  {loading && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {aiStatus === 'analyzing' && 'AI กำลังวิเคราะห์...'}
                      {aiStatus === 'creating_trip' && 'AI กำลังสร้างทริป...'}
                      {aiStatus === 'adding_destinations' && 'AI กำลังเพิ่มสถานที่...'}
                      {aiStatus === 'processing' && 'AI กำลังประมวลผล...'}
                      {aiStatus === 'completed' && 'AI เสร็จสิ้น!'}
                      {aiStatus === 'idle' && 'AI กำลังวางแผน...'}
                    </div>
                  )}
                <LanguageSwitcher />
                  </div>
                </div>
                
                {/* AI Model Selection */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label htmlFor="ai-provider" className="text-xs text-gray-600 mb-1 block">AI Model</Label>
                    <div className="flex gap-2">
                      <Select
                        value={aiConfig.currentProvider}
                        onValueChange={(value: 'openai' | 'claude' | 'gemini') => updateProvider(value)}
                      >
                        <SelectTrigger className="h-9 text-xs">
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
                        <SelectTrigger className="h-9 text-xs">
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
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <MessageCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      สวัสดี! 👋
                    </h3>
                    <p className="text-gray-600 mb-4">
                      ผมคือ AI Travel Assistant ที่จะช่วยวางแผนการเดินทางให้คุณ
                    </p>
                    {tripId && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <p className="text-sm text-blue-700">
                          💡 <strong>เคล็ดลับ:</strong> ตอบคำถาม AI ให้ครบถ้วน เพื่อให้ได้แผนการเดินทางที่สมบูรณ์
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">ลองถามผมดู เช่น:</p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleSend('ฉันอยากไปเที่ยวกรุงเทพ 3 วัน')}
                        >
                          เที่ยวกรุงเทพ 3 วัน
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleSend('แนะนำสถานที่เที่ยวในเชียงใหม่')}
                        >
                          เที่ยวเชียงใหม่
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleSend('วางแผนเที่ยวญี่ปุ่น')}
                        >
                          เที่ยวญี่ปุ่น
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-white border shadow-sm'
                    }`}>
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.created_at!).toLocaleTimeString('th-TH')}
                      </p>
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white border shadow-sm p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-gray-600">AI กำลังคิด...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Suggested Places Section */}
                {suggestedPlaces.length > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      สถานที่แนะนำ
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {suggestedPlaces.map((place, index) => (
                        <div key={place.id} className="bg-white p-3 rounded-lg border border-blue-100 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 text-sm">{place.name}</h4>
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{place.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                {place.rating && (
                                  <div className="flex items-center gap-1 text-xs text-yellow-600">
                                    <Star className="h-3 w-3" />
                                    <span>{place.rating}</span>
                                  </div>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {place.suggested_type === 'restaurant' ? '🍽️ ร้านอาหาร' :
                                   place.suggested_type === 'lodging' ? '🏨 ที่พัก' :
                                   place.suggested_type === 'tourist_attraction' ? '🏛️ ที่เที่ยว' : place.suggested_type}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddSuggestedPlaceToTrip(place)}
                              className="ml-2 h-8 text-xs"
                            >
                              เพิ่ม
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </CardContent>
            
            <div className="border-t p-4">
            <div className="flex space-x-2">
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
          </Card>

          {/* Login Prompt Modal */}
          {showLoginPrompt && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md mx-4">
                <CardHeader>
                  <CardTitle className="text-center">🎉 แผนการเดินทางพร้อมแล้ว!</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-center text-gray-600">
                    เพื่อบันทึกแผนการเดินทางของคุณ ผมแนะนำให้เข้าสู่ระบบก่อน
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500">จะได้:</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>✅ บันทึกแผนไว้ดูใหม่ได้</li>
                      <li>✅ แชร์กับเพื่อน/ครอบครัว</li>
                      <li>✅ ส่งออกเป็น PDF</li>
                      <li>✅ AI จำความชอบของคุณ</li>
                    </ul>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      className="flex-1"
                      onClick={() => setShowLoginModal(true)}
                    >
                      เข้าสู่ระบบ
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={handleSkipLogin}
                    >
                      ข้าม - ดูแผนต่อ
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Login Modal */}
          {showLoginModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="w-full max-w-md mx-4">
                <div className="bg-white rounded-lg p-6">
                  <h2 className="text-xl font-bold mb-4 text-center">เข้าสู่ระบบ</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">อีเมล</label>
                      <input
                        type="email"
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="your@email.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">รหัสผ่าน</label>
                      <input
                        type="password"
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="รหัสผ่านของคุณ"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
                        onClick={handleLoginSuccess}
                      >
                        เข้าสู่ระบบ
                      </button>
                      <button
                        className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600"
                        onClick={() => setShowLoginModal(false)}
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
