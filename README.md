# Acers 🧠

> **Turn passive reading into demonstrated, long-term learning.**

Acers is an AI-powered cognitive study and diagnostic assessment workspace. Rather than reading documents passively, Acers breaks learning into an active loop of reading, active recall checkpoints, multi-format diagnostic assessments, and multi-dimensional cognitive analytics.

---

## ✨ Features

### 📖 1. Interactive Dual-Pane Study Workspace
- **PDF & Bare-Topic Ingestion**: Upload multi-page PDFs with full text layers, thumbnails, and page synchronization, or enter any bare topic to generate a structured AI study guide.
- **Context-Aware Scaffolding**: Highlight text to populate a Context Chip for instant AI queries (*Explain Simply*, *Give Example*, *Give Hint*, *Quiz Me*).
- **Audio Overviews**: Generate spoken conversational podcasts summarizing your material on demand.
- **AI Independence Tracking**: Monitors how much assistance you request per session.

### ⏱️ 2. Smart Active Recall Checkpoints
- **Tri-Signal Spatial Trigger**: Replaces rigid timers with reading-depth anchors. Checkpoints trigger only on concepts you've actively scrolled past and dwelled on for 120–180 seconds.
- **Two-Tier Skip Flow**: Differentiates *"Haven't reached this yet"* (neutral priming) from *"I don't know"* (0% recall penalty).
- **Instant Diagnostic Feedback**: Real-time scoring on Accuracy, Completeness, and Misconceptions.

### 📊 3. Post-Session Synthesis Reports
- **Holistic Session Diagnostics**: Automatically groups concepts into **Strong**, **Uncertain**, and **Weak** matrices.
- **Smart Recommendations**: Suggests targeted next steps and routes directly into the Assessment Hub.

### 🎯 4. Multi-Format Diagnostic Assessment Hub
- **🎙️ Teach It Back (Feynman Technique)**: Explain concepts in your own words via text or voice recording. Powered by a **Hybrid STT Engine** (browser speech preview + lossless Gemini multimodal transcription) with verbal AI feedback playback and hoverable misconception highlights.
- **🕵️ Spot the AI Hallucination ("Two Truths & A Lie")**: Identify subtle AI hallucinations and defend your reasoning. Server-side anti-cheat keeps answer keys strictly hidden from client inspection.
- **🧩 Concept Enigma**: High-stakes deduction game. Guess mystery concepts across 5 progressive diagnostic clue stages (*The Shadow*, *The Constraint*, *The Behavior*, *The Lens*, *The Keystone*) before running out of time or strikes.

### 📈 5. Learning Profile & Cognitive Analytics
- **5-Dimensional Mastery Radar**: Tracks long-term progress across *Understanding*, *Independence*, *Discrimination*, *Analysis*, and *Transfer*.
- **308-Day Activity Heatmap**: GitHub-style 7-row CSS grid tracking your daily study consistency.
- **Strengths & Focus Areas**: Live dynamic lists highlighting your top mastered concepts and priority review areas.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router, Turbopack)](https://nextjs.org/)
- **Frontend / Components**: React 19, [Tailwind CSS v4](https://tailwindcss.com/), `@fontsource/space-mono`, Lucide Icons
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security, Supabase Auth, Supabase Storage)
- **AI Engine**: Google Gemini API via `@google/genai` and `@ai-sdk/google` (`gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3.7-flash`, `gemini-2.5-flash`)
- **PDF & Document Engine**: `react-pdf`, `pdfjs-dist`, `pdf-parse`

---

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v20 or higher recommended)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- A [Supabase](https://supabase.com/) project
- A [Google AI Studio](https://aistudio.google.com/) API Key for Gemini

### 2. Clone the Repository
```bash
git clone https://github.com/your-username/acers.git
cd acers
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key
```

### 4. Database Setup
1. In your Supabase Dashboard, open the **SQL Editor**.
2. Run the migration script located in [`init_schema.sql`](./init_schema.sql) to create all tables and Row Level Security (RLS) policies.
3. In Supabase **Storage**, create two public buckets:
   - `materials` (for uploaded PDF documents)
   - `audio` (for Teach It Back voice recordings)

### 5. Install Dependencies
```bash
npm install
```

### 6. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏗️ Project Architecture

```
src/
├── app/
│   ├── (app)/                   # Main Authenticated Application Layout (with Sidebar)
│   │   ├── library/             # Library Dashboard
│   │   ├── assess/              # Global Assessment Hub
│   │   └── profile/             # Learning Profile & Analytics
│   ├── (auth)/login/            # Authentication (Sign In & Sign Up)
│   ├── materials/
│   │   ├── new/                 # Document Ingestion (Drag-and-Drop & Bare Topic)
│   │   └── [id]/
│   │       ├── study/           # Dual-Pane Study Workspace
│   │       └── report/[sessionId]/ # Session Synthesis Report
│   ├── concepts/[id]/assess/    # Diagnostic Assessment Workspaces
│   │   ├── teach-back/          # Voice & Text Feynman Assessment
│   │   ├── hallucination/       # Two Truths & A Lie Assessment
│   │   └── enigma/              # 5-Stage Diagnostic Clue Game
│   └── api/                     # Next.js Server Route Handlers
│       ├── ai/                  # Gemini AI Orchestration Endpoints
│       └── materials/           # Document Upload & Processing
├── components/
│   ├── ui/                      # Custom Modals, Buttons, Cards, Inputs
│   ├── profile/                 # Heatmap, Skill Radar, Mastery List
│   ├── MarkdownRenderer.tsx     # Zero-Dependency Markdown Formatter
│   ├── PDFViewer.tsx            # Canvas & Text-Layer PDF Engine
│   └── PDFThumbnailSidebar.tsx  # Dynamic Page Preview Sidebar
└── lib/
    ├── supabase/                # Client, Server, and Middleware Helpers
    └── ai/                      # Synthesis & Extraction Utilities
```

---

## 📚 Documentation

For a comprehensive breakdown of all engineering phases, technical challenges, architectural decisions, and API specifications, see:
👉 [**Master Engineering Documentation (DOCUMENTATION.md)**](./DOCUMENTATION.md)

---

## 🛡️ Quality & Verification

- **TypeScript Strict Mode**: Zero compilation errors across all modules.
- **Production Build**: Verified with Next.js Turbopack (`npm run build`).
- **SSR Safe**: Dynamically isolates browser-dependent modules (`pdfjs-dist`).
- **Security**: PostgreSQL Row Level Security (RLS) strictly enforced on all multi-tenant queries.
