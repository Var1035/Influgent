# Influgent: AI Viral Trend Intelligence and Creator Studio

Influgent is an intelligent trend discovery and content creation workstation designed for digital creators, influencers, and growth teams. It monitors trending topics across platforms, extracts viral momentum metrics, and converts trend intelligence into production-ready scripts, hooks, captions, and outlines for YouTube and LinkedIn.

Built voice-first with Wispr Flow integration, creators can articulate concepts and ideas hands-free, turning speech into high-performing content in seconds.

Live Application: https://influgent.vercel.app

---

## Key Features

- **Automated Trend Intelligence**: Discovers viral topics across key creator niches (Tech, Finance, Gaming, Lifestyle, Entertainment, AI) with velocity and engagement metrics.
- **Automated 5x Daily Ingestion**: Executes automated pipeline runs 5 times daily (09:00, 12:00, 15:00, 18:00, 21:00 UTC) via serverless cron jobs to ensure data remains fresh.
- **Creator Studio**: Generates high-converting hooks, structural outlines, production scripts, hashtags, and engagement CTAs tailored for YouTube and LinkedIn.
- **Voice-First Experience**: Integrated with Wispr Flow for natural voice-driven content drafting, script dictation, and prompt input.
- **Invisible Teleprompter Utility**: Built-in transparent floating teleprompter utilizing Windows Desktop Window Manager capture exclusion (`WDA_EXCLUDEFROMCAPTURE`), keeping prompt scripts invisible during screen recordings and video presentations.

---

## Architecture and Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React
- **Backend and Database**: Supabase (PostgreSQL, Row-Level Security, Edge Functions)
- **AI Engine**: Mistral AI API (content ideation, hook generation, script structuring)
- **Data Ingestion**: YouTube Data API v3 (trending regional videos and engagement metrics)
- **Desktop Subsystem**: Electron / Python PySide6 with Windows DWM screen-capture exclusion
- **Hosting and CI/CD**: Vercel

---

## Directory Structure

```text
Influgent/
|-- src/
|   |-- components/          # Reusable UI components (WisprFlowBadge, TeleprompterModal, etc.)
|   |-- pages/               # Application views (Home, Trends, Studio, Workspace)
|   |-- services/            # API clients for Supabase, YouTube, and Mistral AI
|   |-- types/               # TypeScript interfaces and data models
|   |-- App.tsx              # Main routing and navigation
|   `-- main.tsx             # Application entry point
|-- supabase/
|   |-- functions/           # Edge Functions for automated scheduled trend collection
|   `-- migrations/          # PostgreSQL database schema and RLS policies
|-- invisible-teleprompter/  # Standalone capture-proof teleprompter utility
|   |-- electron-app/        # Cross-platform Electron implementation
|   |-- teleprompter.py      # Native Windows DWM PySide6 implementation
|   `-- README.md            # Teleprompter setup and usage guide
|-- public/                  # Static assets and icons
|-- .env.example             # Template for required environment variables
`-- README.md                # Project documentation
```

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm or pnpm
- Supabase account and project
- YouTube Data API v3 key
- Mistral AI API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/<your-username>/Influgent.git
   cd Influgent
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Fill in your API credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_YOUTUBE_API_KEY=your_youtube_api_key
   VITE_MISTRAL_API_KEY=your_mistral_api_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

---

## Invisible Teleprompter Setup

To run the capture-proof teleprompter during video recordings or live demos:

1. Navigate to the teleprompter directory:
   ```bash
   cd invisible-teleprompter
   ```
2. For the Python version (Windows native capture exclusion):
   ```bash
   pip install PyQt5 PySide6
   python teleprompter.py
   ```
3. Or for the Electron version:
   ```bash
   cd electron-app
   npm install
   npm start
   ```

---

## License

This project is licensed under the MIT License.

