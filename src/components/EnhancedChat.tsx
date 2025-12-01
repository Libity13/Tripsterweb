// Enhanced Chat Component with Global State Management
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, Loader2, MapPin } from 'lucide-react';
import { useAppState, appActions, useChat, useTrip, useUI, useError } from '@/context/AppContext';
import { useLanguage } from '@/hooks/useLanguage';
import { aiService, tripService, errorService } from '@/services/enhancedServices';
import { ChatMessage } from '@/types/database';
import { toast } from 'sonner';

const EnhancedChat: React.FC = () => {
  const { dispatch } = useAppState();
  const { chatMessages, aiProcessing, aiProcessingState } = useChat();
  const { currentTrip, tripId } = useTrip();
  const { currentPage } = useUI();
  const { error } = useError();
  const { language } = useLanguage();
  
  const navigate = useNavigate();
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [input, setInput] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Initialize from location state
  useEffect(() => {
    const initialMessage = location.state?.initialMessage;
    if (initialMessage) {
      setInput(initialMessage);
      handleSend(initialMessage);
    }
  }, [location.state]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Handle AI processing state changes
  useEffect(() => {
    if (aiProcessingState === 'completed' && currentTrip?.destinations?.length > 0) {
      console.log('🧭 AI planning completed, navigating to TripPlanner');
      navigate(`/${language}/trip/${tripId}`);
      toast.success('สร้างแผนการเดินทางแล้ว! กำลังนำคุณไปยังหน้าแผนการเดินทาง...');
    }
  }, [aiProcessingState, currentTrip, tripId, navigate, language]);

  const handleSend = async (message: string) => {
    if (!message.trim() || aiProcessing) return;

    try {
      // Add user message
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: message,
        trip_id: tripId || '',
        user_id: 'anonymous',
        created_at: new Date().toISOString(),
        language: 'th'
      };
      
      dispatch(appActions.addChatMessage(userMessage));
      setInput('');

      // Set AI processing state
      dispatch(appActions.setAIProcessing(true));
      dispatch(appActions.setAIProcessingState('analyzing'));

      // Create trip if not exists
      let currentTripId = tripId;
      if (!currentTripId) {
        console.log('🆕 Creating new trip...');
        dispatch(appActions.setAIProcessingState('planning'));
        
        const newTrip = await tripService.createTrip({
          title: 'ทริปใหม่',
          description: 'ทริปที่สร้างจาก AI Chat',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          budget_max: 10000,
          budget_min: 1000
        });
        
        currentTripId = newTrip.id;
        dispatch(appActions.setTripId(currentTripId));
        dispatch(appActions.setCurrentTrip(newTrip));
        
        console.log('✅ New trip created:', currentTripId);
      }

      // Process AI response
      const aiResponse = await aiService.processUserInput(message, {
        tripId: currentTripId,
        history: chatMessages.map(m => ({ role: m.role, content: m.content })),
        language: 'th'
      });

      // Add AI message
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse.message,
        trip_id: currentTripId,
        user_id: 'ai',
        created_at: new Date().toISOString(),
        language: 'th'
      };
      
      dispatch(appActions.addChatMessage(aiMessage));

      // Process AI actions
      if (aiResponse.success && aiResponse.actions.length > 0) {
        await processAIActions(aiResponse.actions, currentTripId);
      }

      // Update processing state
      dispatch(appActions.setAIProcessingState(aiResponse.processingState));
      
    } catch (error) {
      console.error('❌ Error in handleSend:', error);
      const errorInfo = errorService.handleError(error, 'handleSend');
      dispatch(appActions.setError(errorInfo.message, errorInfo.type));
      toast.error(errorInfo.message);
    } finally {
      dispatch(appActions.setAIProcessing(false));
    }
  };

  const processAIActions = async (actions: any[], tripId: string) => {
    try {
      console.log('🤖 Processing AI actions:', actions);
      
      for (const action of actions) {
        switch (action.action) {
          case 'ADD_DESTINATIONS':
            await handleAddDestinations(action, tripId);
            break;
          case 'REMOVE_DESTINATIONS':
            await handleRemoveDestinations(action, tripId);
            break;
          case 'ASK_PERSONAL_INFO':
            // No action needed, just continue conversation
            break;
          default:
            console.log('ℹ️ No action needed for:', action.action);
        }
      }
      
      // Reload trip data
      const updatedTrip = await tripService.getTrip(tripId);
      if (updatedTrip) {
        dispatch(appActions.setCurrentTrip(updatedTrip));
      }
      
    } catch (error) {
      console.error('❌ Error processing AI actions:', error);
      const errorInfo = errorService.handleError(error, 'processAIActions');
      dispatch(appActions.setError(errorInfo.message, errorInfo.type));
    }
  };

  const handleAddDestinations = async (action: any, tripId: string) => {
    try {
      console.log('📍 Adding destinations:', action.destinations);
      dispatch(appActions.setAIProcessingState('adding_destinations'));
      
      const destinations = [];
      for (const dest of action.destinations) {
        const resolved = await aiService.resolvePlace(dest.name, action.location_context);
        if (resolved) {
          destinations.push({
            trip_id: tripId,
            place_id: resolved.place_id,
            name: resolved.name,
            name_en: resolved.name,
            description: resolved.formatted_address || '',
            description_en: resolved.formatted_address || '',
            formatted_address: resolved.formatted_address,
            latitude: resolved.lat,
            longitude: resolved.lng,
            visit_date: action.day || 1,
            place_types: dest.place_type ? [dest.place_type] : ['tourist_attraction'],
            photos: [],
            estimated_cost: null,
            visit_duration: dest.minHours ? Math.round(dest.minHours * 60) : null,
            rating: resolved.rating,
            user_ratings_total: resolved.user_ratings_total,
            price_level: resolved.price_level,
            opening_hours: null,
            order_index: 1
          });
        }
      }
      
      if (destinations.length > 0) {
        await tripService.addDestinationsBatch(tripId, destinations);
        console.log('✅ Destinations added:', destinations.length);
      }
      
    } catch (error) {
      console.error('❌ Error adding destinations:', error);
      throw error;
    }
  };

  const handleRemoveDestinations = async (action: any, tripId: string) => {
    try {
      console.log('🗑️ Removing destinations:', action.destination_names);
      await tripService.removeDestinationsByNames(tripId, action.destination_names);
      console.log('✅ Destinations removed');
    } catch (error) {
      console.error('❌ Error removing destinations:', error);
      throw error;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const handleViewTrip = () => {
    if (tripId) {
      navigate(`/${language}/trip/${tripId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="h-[700px] flex flex-col">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-100 border border-gray-200">
                      <img src="/TripsterAvatar.png" alt="Tripster AI" className="h-full w-full object-cover" />
                    </div>
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
                      onClick={handleViewTrip}
                      className="flex items-center gap-2"
                    >
                      <MapPin className="h-4 w-4" />
                      ดูแผนการเดินทาง
                    </Button>
                  )}
                  {aiProcessing && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {aiProcessingState === 'analyzing' && 'AI กำลังวิเคราะห์...'}
                      {aiProcessingState === 'planning' && 'AI กำลังวางแผน...'}
                      {aiProcessingState === 'adding_destinations' && 'AI กำลังเพิ่มสถานที่...'}
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center py-8">
                    <img src="/TripsterAvatar.png" alt="Tripster AI" className="mx-auto h-16 w-16 rounded-full object-cover mb-4" />
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
                          onClick={() => handleSend('แนะนำการเดินทางงบประหยัดที่ภูเก็ต')}
                        >
                          เที่ยวภูเก็ต
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
                
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden mt-1">
                        <img src="/TripsterAvatar.png" alt="AI" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                
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
                  disabled={aiProcessing}
                  className="flex-1"
                />
                <Button 
                  onClick={() => handleSend(input)}
                  disabled={aiProcessing || !input.trim()}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default EnhancedChat;