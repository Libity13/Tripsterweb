# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TravelMate AI is an AI-powered trip planning application built with React, TypeScript, Vite, and Supabase. The app allows users to create travel plans through a conversational AI interface, visualize destinations on a map, and manage itineraries with drag-and-drop functionality.

## Development Commands

```bash
# Install dependencies
npm i

# Start development server (runs on http://localhost:8080)
npm run dev

# Build for production
npm run build

# Build for development (with development mode settings)
npm run build:dev

# Run linter
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui components (Radix UI primitives)
- **Styling**: Tailwind CSS with custom theme
- **Backend**: Supabase (PostgreSQL database, Edge Functions, Realtime)
- **Routing**: React Router v6
- **State Management**: React Query (@tanstack/react-query)
- **Maps**: Mapbox GL
- **Forms**: React Hook Form + Zod validation

### Key Application Structure

**Main Pages** (src/pages/):
- `Index.tsx` - Landing page with hero section and example prompts
- `Chat.tsx` - Conversational AI interface for creating trips
- `TripPlanner.tsx` - Main trip planning interface with three-panel layout:
  - ChatPanel: AI conversation for trip modifications
  - ItineraryPanel: Drag-and-drop destination list
  - MapView: Interactive map showing destinations

**Core Components** (src/components/trip/):
- `ChatPanel.tsx` - AI chat interface for trip planning
- `ItineraryPanel.tsx` - Sortable destination list with @dnd-kit
- `MapView.tsx` - Mapbox integration for visualizing destinations

**Database Schema** (defined in src/integrations/supabase/types.ts):
- `profiles` - User profile information
- `trips` - Trip metadata (title, dates, budget, description)
- `destinations` - Individual destinations within a trip (ordered, with coordinates)
- `chat_messages` - Conversation history per trip

### Supabase Integration

**Authentication**:
- Auto-persisted sessions using localStorage
- RLS policies enforce user can only access their own data

**Edge Functions**:
- `google-places` - Proxy for Google Places API (search, details, nearby, autocomplete)

**Environment Variables** (required):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

**Secrets in Supabase Vault** (see setup-api-keys.md):
- `GOOGLE_PLACES_API_KEY` - For place search and details
- `GEMINI_API_KEY` - For AI conversation
- `MAPBOX_ACCESS_TOKEN` - For map rendering (optional)

### Component System

This project uses shadcn/ui components configured via `components.json`. Components are located in `src/components/ui/` and use:
- Tailwind CSS with CSS variables for theming
- Path alias `@/` maps to `src/`
- Base color: slate
- All components use TypeScript

### Routing Structure

Routes defined in App.tsx:
- `/` - Landing page
- `/chat` - New trip creation chat
- `/trip/:id` - Trip planner interface (requires trip ID)
- `*` - 404 Not Found page

## Code Patterns

### Data Fetching
Use React Query for async operations with Supabase:
```typescript
const { data, error } = await supabase
  .from('trips')
  .select('*')
  .eq('user_id', userId)
```

### Type Safety
- Database types are auto-generated in `src/integrations/supabase/types.ts`
- Use `Tables<'table_name'>` for row types
- Use `TablesInsert<'table_name'>` for insert operations

### Drag and Drop
Uses @dnd-kit library:
- DndContext wraps sortable items
- SortableContext manages array of sortable IDs
- useSortable hook provides drag handlers and transforms

### Real-time Updates
Supabase Realtime is enabled for trips, destinations, and chat_messages tables.

## Working with Mapbox

The MapView component requires MAPBOX_ACCESS_TOKEN. Map interactions:
- Displays markers for all destinations
- Supports adding destinations by clicking map
- Auto-fits bounds to show all destinations

## Thai Language Support

UI text is primarily in Thai language. Maintain this convention when adding new UI elements or messages.

## Important Notes

- This is a Lovable.dev project - changes can be made via Lovable or locally
- Uses Bun lock file (`bun.lockb`) but npm commands in package.json
- Port 8080 is configured in vite.config.ts (not the default 5173)
- Path aliases use `@/` prefix configured in tsconfig and vite.config
