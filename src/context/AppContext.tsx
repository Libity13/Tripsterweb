// Global App State Management
import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { Trip, Destination, ChatMessage } from '@/types/database';

// State Interface
interface AppState {
  // User State
  user: any | null;
  isAuthenticated: boolean;
  
  // Trip State
  currentTrip: Trip | null;
  tripId: string | null;
  tripLoading: boolean;
  
  // Chat State
  chatMessages: ChatMessage[];
  aiProcessing: boolean;
  aiProcessingState: 'idle' | 'analyzing' | 'planning' | 'adding_destinations' | 'completed' | 'error';
  
  // UI State
  currentPage: 'index' | 'chat' | 'trip';
  navigationPending: boolean;
  showLoginModal: boolean;
  showLoginPrompt: boolean;
  
  // Error State
  error: string | null;
  errorType: 'network' | 'ai' | 'database' | 'validation' | null;
}

// Action Types
type AppAction =
  | { type: 'SET_USER'; payload: any | null }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_CURRENT_TRIP'; payload: Trip | null }
  | { type: 'SET_TRIP_ID'; payload: string | null }
  | { type: 'SET_TRIP_LOADING'; payload: boolean }
  | { type: 'SET_CHAT_MESSAGES'; payload: ChatMessage[] }
  | { type: 'ADD_CHAT_MESSAGE'; payload: ChatMessage }
  | { type: 'SET_AI_PROCESSING'; payload: boolean }
  | { type: 'SET_AI_PROCESSING_STATE'; payload: AppState['aiProcessingState'] }
  | { type: 'SET_CURRENT_PAGE'; payload: AppState['currentPage'] }
  | { type: 'SET_NAVIGATION_PENDING'; payload: boolean }
  | { type: 'SET_SHOW_LOGIN_MODAL'; payload: boolean }
  | { type: 'SET_SHOW_LOGIN_PROMPT'; payload: boolean }
  | { type: 'SET_ERROR'; payload: { message: string | null; type: AppState['errorType'] } }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_STATE' };

// Initial State
const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  currentTrip: null,
  tripId: null,
  tripLoading: false,
  chatMessages: [],
  aiProcessing: false,
  aiProcessingState: 'idle',
  currentPage: 'index',
  navigationPending: false,
  showLoginModal: false,
  showLoginPrompt: false,
  error: null,
  errorType: null,
};

// Reducer
const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    
    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };
    
    case 'SET_CURRENT_TRIP':
      return { ...state, currentTrip: action.payload };
    
    case 'SET_TRIP_ID':
      return { ...state, tripId: action.payload };
    
    case 'SET_TRIP_LOADING':
      return { ...state, tripLoading: action.payload };
    
    case 'SET_CHAT_MESSAGES':
      return { ...state, chatMessages: action.payload };
    
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatMessages: [...state.chatMessages, action.payload] };
    
    case 'SET_AI_PROCESSING':
      return { ...state, aiProcessing: action.payload };
    
    case 'SET_AI_PROCESSING_STATE':
      return { ...state, aiProcessingState: action.payload };
    
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };
    
    case 'SET_NAVIGATION_PENDING':
      return { ...state, navigationPending: action.payload };
    
    case 'SET_SHOW_LOGIN_MODAL':
      return { ...state, showLoginModal: action.payload };
    
    case 'SET_SHOW_LOGIN_PROMPT':
      return { ...state, showLoginPrompt: action.payload };
    
    case 'SET_ERROR':
      return { 
        ...state, 
        error: action.payload.message, 
        errorType: action.payload.type 
      };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null, errorType: null };
    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
};

// Context
const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// Provider Component
export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

// Custom Hook
export const useAppState = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
};

// Action Creators
export const appActions = {
  setUser: (user: any | null) => ({ type: 'SET_USER' as const, payload: user }),
  setAuthenticated: (authenticated: boolean) => ({ type: 'SET_AUTHENTICATED' as const, payload: authenticated }),
  setCurrentTrip: (trip: Trip | null) => ({ type: 'SET_CURRENT_TRIP' as const, payload: trip }),
  setTripId: (tripId: string | null) => ({ type: 'SET_TRIP_ID' as const, payload: tripId }),
  setTripLoading: (loading: boolean) => ({ type: 'SET_TRIP_LOADING' as const, payload: loading }),
  setChatMessages: (messages: ChatMessage[]) => ({ type: 'SET_CHAT_MESSAGES' as const, payload: messages }),
  addChatMessage: (message: ChatMessage) => ({ type: 'ADD_CHAT_MESSAGE' as const, payload: message }),
  setAIProcessing: (processing: boolean) => ({ type: 'SET_AI_PROCESSING' as const, payload: processing }),
  setAIProcessingState: (state: AppState['aiProcessingState']) => ({ type: 'SET_AI_PROCESSING_STATE' as const, payload: state }),
  setCurrentPage: (page: AppState['currentPage']) => ({ type: 'SET_CURRENT_PAGE' as const, payload: page }),
  setNavigationPending: (pending: boolean) => ({ type: 'SET_NAVIGATION_PENDING' as const, payload: pending }),
  setShowLoginModal: (show: boolean) => ({ type: 'SET_SHOW_LOGIN_MODAL' as const, payload: show }),
  setShowLoginPrompt: (show: boolean) => ({ type: 'SET_SHOW_LOGIN_PROMPT' as const, payload: show }),
  setError: (message: string | null, type: AppState['errorType']) => ({ type: 'SET_ERROR' as const, payload: { message, type } }),
  clearError: () => ({ type: 'CLEAR_ERROR' as const }),
  resetState: () => ({ type: 'RESET_STATE' as const }),
};

// Selector Hooks
export const useUser = () => {
  const { state } = useAppState();
  return { user: state.user, isAuthenticated: state.isAuthenticated };
};

export const useTrip = () => {
  const { state } = useAppState();
  return { 
    currentTrip: state.currentTrip, 
    tripId: state.tripId, 
    tripLoading: state.tripLoading 
  };
};

export const useChat = () => {
  const { state } = useAppState();
  return { 
    chatMessages: state.chatMessages, 
    aiProcessing: state.aiProcessing, 
    aiProcessingState: state.aiProcessingState 
  };
};

export const useUI = () => {
  const { state } = useAppState();
  return { 
    currentPage: state.currentPage, 
    navigationPending: state.navigationPending,
    showLoginModal: state.showLoginModal,
    showLoginPrompt: state.showLoginPrompt
  };
};

export const useError = () => {
  const { state } = useAppState();
  return { error: state.error, errorType: state.errorType };
};
