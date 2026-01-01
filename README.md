# Tutera-Home

A modern smart home control app for Crestron Home systems with AI-powered voice commands, Apple TV remote control, and beautiful UI.

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8)

## Features

- 🏠 **Room Controls** - Lighting, shades, climate, and security
- 🎬 **Media Control** - Full Apple TV remote with D-pad navigation
- 🤖 **AI Commands** - Natural language control via OpenAI
- 🌡️ **Climate** - Thermostat control and monitoring
- 🔒 **Security** - Lock status and control
- 🎭 **Scenes** - One-tap scene activation
- 📱 **Responsive** - Works on mobile, tablet, and desktop

## Prerequisites

- Node.js 18+ 
- Crestron Home processor on your network
- (Optional) OpenAI API key for AI features
- (Optional) pyatv service for Apple TV control

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/jct-code/Tutera-Home.git
cd Tutera-Home
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy `env.example` to `.env.local` and fill in your values:

```bash
cp env.example .env.local
```

Edit `.env.local`:
```env
PROCESSOR_IP=192.168.20.xxx        # Your Crestron processor IP
CRESTRON_HOME_KEY=your-token       # Your Crestron auth key
OPENAI_API_KEY=sk-xxx              # OpenAI API key (optional)
PYATV_SERVICE_URL=http://192.168.20.2:8000  # pyatv service URL
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment Options

### Option 1: Local Network (Recommended)

Run on a device on your home network (PC, Raspberry Pi, etc.) for direct access to Crestron and Apple TV services.

### Option 2: Replit

1. Import this repository on [Replit](https://replit.com)
2. Add environment variables in Replit's Secrets tab
3. **Note:** Requires tunneling (Tailscale/Cloudflare) to access local Crestron processor

### Option 3: Vercel

1. Connect your GitHub repository to [Vercel](https://vercel.com)
2. Add environment variables in Vercel's dashboard
3. **Note:** Requires tunneling to access local network devices

## Apple TV Setup

See [docs/appletv-pairing-guide.md](docs/appletv-pairing-guide.md) for pairing instructions.

The pyatv service runs on a Synology NAS. See [docs/synology-pyatv-setup.md](docs/synology-pyatv-setup.md) for setup.

## Project Structure

```
tutera-home/
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── api/          # API routes (Crestron proxy, AI, Apple TV)
│   │   ├── lighting/     # Lighting control page
│   │   ├── media/        # Media control page
│   │   ├── climate/      # Climate control page
│   │   ├── security/     # Security page
│   │   └── settings/     # Settings & Apple TV pairing
│   ├── components/       # React components
│   ├── lib/              # Utilities and API clients
│   └── stores/           # Zustand state stores
├── services/
│   └── pyatv/            # Apple TV control service (Docker)
├── docs/                 # Documentation
└── data/                 # Room and zone configurations
```

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **State:** Zustand
- **Animations:** Framer Motion
- **AI:** OpenAI GPT-4
- **Apple TV:** pyatv (Python service)

## License

Private - All rights reserved.
