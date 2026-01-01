# Crestron Home Dashboard

## Overview
A Next.js web application for controlling Crestron Home smart home systems. This dashboard provides an interface for managing lighting, climate, media, security, and scenes through a Crestron Home processor.

## Project Structure
- `src/app/` - Next.js App Router pages and API routes
  - `api/` - Backend API routes for Crestron, AI, weather, and AppleTV
  - `climate/`, `lighting/`, `media/`, `security/`, `scenes/` - Feature pages
  - `login/` - Authentication page
- `src/components/` - React components
  - `ai/` - AI command components
  - `devices/` - Device control cards (lights, thermostats, shades, etc.)
  - `layout/` - Header, navigation, quick actions
  - `providers/` - Data providers
  - `ui/` - Reusable UI components
- `src/lib/` - Utility libraries
  - `crestron/` - Crestron API client and types
  - `ai/` - AI command processing
- `src/stores/` - Zustand state stores
- `data/` - JSON configuration files
- `services/pyatv/` - Python AppleTV service (Docker)

## Tech Stack
- Next.js 16 with App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Zustand for state management
- Framer Motion for animations
- Radix UI for accessible components
- OpenAI for AI command processing

## Running the Application
- Development: `npm run dev` (runs on port 5000)
- Production: `npm run build && npm run start`

## Environment Variables
- `CRESTRON_HOME_KEY` - Authorization token for Crestron Home API (optional)
- `OPENAI_API_KEY` - For AI command features

## Configuration
- The app connects to a Crestron Home processor via IP address
- Users configure the processor IP on the login page
- The processor must be accessible from the network where this app runs
