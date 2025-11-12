# Tripsterweb - AI-Powered Journey Planner

## About

Tripsterweb is an intelligent travel planning application that uses AI to help users create personalized trip itineraries. Built with modern web technologies and integrated with multiple AI providers (OpenAI, Claude, Gemini) for natural language trip planning.

## Project info

**URL**: https://lovable.dev/projects/8a6d15f9-4633-4a31-aa13-9b726742c5aa

## Features

- 🤖 **Multi-AI Support**: Choose between OpenAI, Claude, or Gemini for trip planning
- 🗺️ **Interactive Maps**: Google Maps integration for route planning and place visualization
- 💬 **AI Chat Interface**: Natural language conversation for trip planning
- 📍 **Google Places Integration**: Search and add destinations with detailed place information
- 🌐 **Multi-language Support**: Thai and English language support
- 👤 **Guest Mode**: Use the app without signing up
- 🔐 **User Authentication**: Supabase authentication with Google Sign-In

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/8a6d15f9-4633-4a31-aa13-9b726742c5aa) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone https://github.com/Libity13/Tripsterweb.git

# Step 2: Navigate to the project directory.
cd Tripsterweb

# Step 3: Install the necessary dependencies.
npm install

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Environment Setup

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Maps API
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_GOOGLE_PLACES_API_KEY=your_google_places_api_key

# Mapbox (Optional)
VITE_MAPBOX_TOKEN=your_mapbox_token
```

For Supabase Edge Functions, set these secrets in Supabase Dashboard:
- `OPENAI_API_KEY`
- `CLAUDE_API_KEY`
- `GEMINI_API_KEY`
- `GOOGLE_MAPS_API_KEY`

## What technologies are used for this project?

This project is built with:

- **Vite** - Fast build tool and dev server
- **TypeScript** - Type-safe JavaScript
- **React** - UI library
- **shadcn-ui** - Beautiful UI components
- **Tailwind CSS** - Utility-first CSS framework
- **Supabase** - Backend as a Service (Database, Auth, Edge Functions)
- **Google Maps API** - Maps and Places integration

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/8a6d15f9-4633-4a31-aa13-9b726742c5aa) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## License

This project is private and proprietary.
