# Acers: Project Architecture & Engineering Master Documentation

> **Acers** is an intelligent cognitive study and assessment ecosystem engineered to transform passive reading into demonstrated, long-term learning through real-time AI pedagogical scaffolding, spatial active recall checkpoints, multi-format diagnostic assessments, and multi-dimensional mastery analytics.

---

## 1. Executive Summary & Core Philosophy

Traditional e-learning platforms suffer from the "illusion of competence" — students read or highlight text passively without testing their retrieval pathways or synthesizing mental models. 

**Acers** eliminates passive consumption by enforcing an active learning loop:

$$\text{Material Ingestion} \longrightarrow \text{Study Workspace} \longrightarrow \text{Active Recall Checkpoints} \longrightarrow \text{Session Synthesis} \longrightarrow \text{Multi-Format Assessments} \longrightarrow \text{Cognitive Analytics}$$

---

## 2. System Architecture & Tech Stack

```
+-----------------------------------------------------------------------------------+
|                                   Client Layer                                    |
|  Next.js 16 App Router | React 19 | Tailwind CSS | Space Mono Typography          |
|  Custom Modal Dialog System | Native Tailwind Charts | Hybrid Web Speech STT      |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                            Next.js Fullstack Server                               |
|  Route Handlers (REST) | Server Actions | Vercel AI SDK Streaming UI              |
|  Dynamic SSR Isolation (pdfjs-dist) | Custom Regex Markdown Parser Engine          |
+-----------------------------------------------------------------------------------+
                    |                                             |
                    v                                             v
+------------------------------------+       +--------------------------------------+
|       Google Gemini AI Fleet       |       |           Supabase Backend           |
| • gemini-3.5-flash-lite (Chat/Q&A) |       | • PostgreSQL Database + RLS          |
| • gemini-3.1-flash-lite (Extract)  |       | • Supabase Auth (JWT & Cookies)      |
| • gemini-3.7-flash (Grade/Report)  |       | • Supabase Storage (PDFs & Audio)    |
| • gemini-2.5-flash (Audio/TTS/STT) |       | • Normalized Mastery Tracking        |
+------------------------------------+       +--------------------------------------+
```

### 2.1 Technology Matrix

| Layer | Technology | Rationale & Selection Criteria |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.3.2 (App Router, Turbopack) | Modern server-side rendering, streaming route handlers, and unified API routes. |
| **Runtime / Language** | Node.js / TypeScript 5 (Strict Mode) | Full type-safety across backend API payloads and frontend components. |
| **Styling & Design System** | Tailwind CSS v4 + `@fontsource/space-mono` | Warm, analog-inspired "paper & ink" aesthetic (`#F8F4EC`, `#2D2A26`, `#FFFDF8`). Zero runtime CSS overhead. |
| **Database & Auth** | Supabase (PostgreSQL + RLS + GoTrue Auth) | Secure row-level multi-tenancy, transactional consistency, and integrated asset storage. |
| **AI Orchestration** | `@google/genai` & `@ai-sdk/google` | Low-latency inference, native JSON schema enforcement with Zod, and streaming text support. |
| **Speech & Audio** | Hybrid Web Speech API + Gemini Multimodal Audio | Real-time visual feedback combined with lossless server-side transcription and synthesized feedback audio. |
| **Document Processing** | `pdf-parse` (Server) + `react-pdf` (Client) | High-fidelity PDF rendering with page thumbnails and synchronized text layer selection. |

---

## 3. Database Schema & Multi-Tenancy Design

All tables enforce PostgreSQL **Row Level Security (RLS)** linked directly to `auth.uid() = user_id`.

```sql
-- 1. Study Materials
create table materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  source_type text not null check (source_type in ('uploaded_doc', 'bare_topic')),
  raw_content text,
  storage_path text,
  created_at timestamptz not null default now()
);

-- 2. Extracted Educational Concepts
create table concepts (
  id uuid primary key default gen_random_uuid(),
  material_id uuid references materials(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  location_marker text,
  created_at timestamptz not null default now()
);

-- 3. Study Sessions
create table study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  material_id uuid references materials(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  ai_dependence_count int not null default 0
);

-- 4. Interstitial Recall Attempts
create table recall_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references study_sessions(id) on delete cascade,
  concept_id uuid not null references concepts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  input_text text not null,
  ai_feedback jsonb not null,
  created_at timestamptz not null default now()
);

-- 5. Diagnostic Assessment Submissions
create table assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references concepts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  format text not null check (format in ('teach_back', 'hallucination', 'progressive_case')),
  status text not null default 'completed' check (status in ('in_progress', 'completed')),
  input jsonb not null,
  ai_grading jsonb,
  audio_storage_path text,
  created_at timestamptz not null default now()
);

-- 6. Normalized Cognitive Mastery Dimensions
create table concept_mastery (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references concepts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  dimension text not null check (dimension in ('understanding', 'independence', 'discrimination', 'analysis', 'transfer')),
  score numeric not null check (score >= 0 and score <= 100),
  last_updated timestamptz not null default now(),
  unique (concept_id, dimension)
);

-- 7. Post-Session Synthesis Reports
create table reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references study_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  strong_concept_ids uuid[] not null default '{}',
  uncertain_concept_ids uuid[] not null default '{}',
  weak_concept_ids uuid[] not null default '{}',
  retrieval_score numeric,
  recommended_next_step text,
  created_at timestamptz not null default now()
);
```

---

## 4. Phase-by-Phase Implementation Journey

### Phase 1: Foundation, Ingestion & Navigation
* **Objectives:** Establish Supabase authentication, multi-tenant database policies, responsive landing page, material ingestion pipeline (PDF upload + bare topic generator), and global app navigation.
* **Implementation:**
  * Created `/login` with clean card layout and custom modal alert handlers.
  * Implemented `/materials/new` supporting drag-and-drop document upload and instant AI study guide generation.
  * Created `/api/materials/upload` using `pdf-parse` for server-side text extraction.
  * Implemented `/api/ai/concept-extract` to automatically extract 4–8 discrete concepts per document with location markers.
  * Built global `<AppSidebar>` layout under `src/app/(app)/layout.tsx` unifying Library, Assessments, and Profile.

### Phase 2: Dual-Pane Interactive Study Workspace
* **Objectives:** Build desktop-first split workspace (document viewer on the left, AI assistant panel on the right) with streaming responses and contextual text-selection queries.
* **Implementation:**
  * Embedded `<PDFViewer>` with page synchronization and `<PDFThumbnailSidebar>`.
  * Implemented text selection listener that populates a "Context Chip" in the chat prompt.
  * Built 4 cognitive quick-action prompts: *Explain Simply*, *Give Example*, *Give Hint*, and *Quiz Me*.
  * Wired `/api/chat/route.ts` using Vercel AI SDK to stream plain-text responses.
  * Added session activity timers and AI dependence tracking (`ai_dependence_count`).

### Phase 3: Spatial Recall Checkpoints & Session Reports
* **Objectives:** Implement an anti-cramming, spatial checkpoint engine that triggers active recall tests without interrupting reading flow, followed by an end-of-session diagnostic report.
* **Implementation:**
  * Built **Hybrid Tri-Signal Triggering Engine**:
    1. *Spatial Reading Depth*: Checkpoints only test concepts already scrolled past.
    2. *Active Dwell Time*: Checkpoints require 120–180 seconds of active mouse/scroll engagement before triggering.
    3. *Two-Tier Skip*: Differentiates *"Haven't reached this yet"* (neutral) from *"I forgot"* (0% penalty).
  * Built `/api/ai/recall-grade` providing instant 0–100 accuracy, completeness, and misconception breakdowns.
  * Built `/api/chat/explain` and `report-synthesize.ts` for deep post-session summary generation.
  * Built `/materials/[id]/report/[sessionId]` displaying retrieval scores, strong/weak concept matrices, and smart routing into the Assessment Hub.

### Phase 4: Assessment Format 1 — AI Hallucination ("Two Truths & A Lie")
* **Objectives:** Test fine-grained concept discrimination by presenting three generated statements where one contains a subtle, plausible AI hallucination.
* **Implementation:**
  * Built `/api/ai/hallucination-generate` generating 2 factual truths and 1 subtle falsehood.
  * **Server-Side Anti-Cheat**: Stored the `false_index` inside Supabase draft rows (`assessment_attempts` with `status = 'in_progress'`), keeping the true answer inaccessible from client browser devtools.
  * Built `/api/ai/hallucination-grade` evaluating both the statement selection and the user's written explanation.
  * Automatically upserted `concept_mastery` scores for the `discrimination` dimension.

### Phase 5: Assessment Format 2 — Teach-It-Back & Voice Engine
* **Objectives:** Enforce the Feynman Technique by requiring students to explain a concept in their own words via text or voice recording, with AI speech transcription and synthesized audio feedback.
* **Implementation:**
  * Built dual-mode input: rich text editing and full microphone audio recording.
  * Implemented **Hybrid STT Engine**: Native browser Web Speech API for immediate visual feedback during speech, coupled with lossless `MediaRecorder` recording submitted to Gemini on stop for flawless technical transcription.
  * Built `/api/ai/teach-back-grade` scoring Accuracy, Completeness, and Reasoning, with hoverable misconception highlights on the transcript.
  * Built `/api/ai/teach-back-audio` providing synthesized verbal audio commentary.

### Phase 6: Assessment Format 3 — Concept Enigma
* **Objectives:** High-stakes deduction game where students guess a mystery concept based on 5 progressive diagnostic clues before running out of time or strikes.
* **Implementation:**
  * Built `/api/ai/enigma-generate` generating 5 progressive clue stages: *The Shadow*, *The Constraint*, *The Behavior*, *The Lens*, and *The Keystone*.
  * Built `EnigmaWorkspace.tsx` with animated clue reveals, shake animations on wrong guesses, heart/strike tracking, and countdown timers.
  * Wired automatic completion routing back to the global Assessment Hub.

### Phase 7: Learning Profile & Cognitive Analytics
* **Objectives:** Provide a centralized dashboard tracking long-term mastery across the 5 core cognitive dimensions, historical activity, and mastery lists.
* **Implementation:**
  * Built `/profile` dashboard querying aggregated user sessions and mastery scores.
  * Built `<SkillRadar>` using pure Tailwind CSS responsive bar visualizations (avoiding fragile heavy charting dependencies).
  * Built `<ActivityHeatmap>` as a 7-row CSS grid rendering 308 days (~44 weeks) of study commits.
  * Built `<MasteryList>` displaying Top Strengths and Primary Focus Areas.

### Polish, Optimization & Hardening
* **Objectives:** Eliminate native browser alerts, support drag-and-drop file ingestion, fix Next.js 16 SSR crashes, and render AI markdown cleanly.
* **Implementation:**
  * Built `<Modal>` component in `src/components/ui/modal.tsx` matching the application's warm cream and dark slate palette.
  * Replaced every `window.alert` and `window.confirm` across all pages.
  * Added HTML5 drag-and-drop file listeners with visual hover states to `/materials/new`.
  * Built zero-dependency `<MarkdownRenderer>` engine with aggressive newline and inline heading normalization.
  * Fixed Next.js Turbopack SSR issues with `pdfjs-dist` via dynamic client loading.

---

## 5. Technical Challenges & Engineering Solutions

### 1. Next.js 16 Turbopack vs. External Charting Libraries
* **Problem:** Importing `recharts@2.13.0` caused severe Turbopack compilation crashes due to internal `es-toolkit` resolution failures (`Module not found: Can't resolve '../../predicate/isLength.js'`).
* **Root Cause:** Next.js 16 Turbopack strictly resolves subpath exports from deeply nested ESM modules.
* **Solution:** Replaced external charting libraries with a native, zero-dependency Tailwind CSS visualization component (`SkillRadar.tsx`), guaranteeing zero compile overhead and perfect theme alignment.

### 2. Server-Side Rendering (SSR) Crash on PDF Components (`DOMMatrix is not defined`)
* **Problem:** Visiting `/materials/[id]/study` threw a fatal runtime error: `DOMMatrix is not defined` originating from `PDFThumbnailSidebar.tsx`.
* **Root Cause:** `react-pdf` imports `pdfjs-dist`, which accesses browser-only global objects (`DOMMatrix`, `window`) during module evaluation on the server.
* **Solution:** Wrapped both `PDFViewer` and `PDFThumbnailSidebar` in `next/dynamic` with `{ ssr: false }`, ensuring execution only occurs in client browser contexts.

### 3. Voice Transcription Accuracy & Gemini REST Constraints
* **Problem:** Native Web Speech API produced ~70% accuracy on complex domain terms, while direct live streaming via Gemini REST endpoints is not supported without complex WebSockets.
* **Root Cause:** Browser speech recognition engines lack domain-specific academic vocabulary models.
* **Solution:** Implemented a **Hybrid Transcription Engine**:
  1. Frontend uses `webkitSpeechRecognition` for real-time typing visuals while the user speaks.
  2. Frontend simultaneously buffers raw audio using `MediaRecorder`.
  3. On click "Stop", the lossless WebM audio is dispatched to `/api/ai/teach-back-transcribe` (Gemini 2.5/3.5 audio processing), which overwrites the text with a pristine, perfectly punctuated academic transcript.

### 4. Gemini Multimodal Audio Model Generation Rejection
* **Problem:** Calling `/api/ai/teach-back-audio` failed with: `INVALID_ARGUMENT: Model tried to generate text, but it should only be used for TTS`.
* **Root Cause:** Gemini multimodal audio models require strict system instructions forbidding textual tokens when audio modalities are requested.
* **Solution:** Configured the Gemini client to request audio modalities with explicit synthesis instructions and fallback handling.

### 5. Escaped AI Markdown & Newline Normalization
* **Problem:** AI-generated bare topics appeared as single, unformatted blocks of text with inline `## Headings` and literal `\n` character strings.
* **Root Cause:** HTML collapses white space by default, and JSON serialization often escapes backslashes.
* **Solution:** Created `src/components/MarkdownRenderer.tsx` with a dual-stage normalization pipeline:
  1. Regex normalization: `replace(/([^\n])\s*(#{1,3}\s)/g, '$1\n\n$2')` to force linebreaks before inline headings.
  2. Element mapping: Converts headings, bullet lists, bold markers, and paragraphs into semantic, styled Tailwind elements.

### 6. Supabase Row Level Security on Nested Aggregations
* **Problem:** Querying `study_sessions` directly failed under strict RLS policies because the table lacked a direct `user_id` foreign key policy.
* **Root Cause:** Security policies restricted session queries to material ownership relations.
* **Solution:** Structured the server queries to fetch through materials: `.from('materials').select('id, study_sessions(...)').eq('user_id', user.id)`, ensuring 100% compliance with Supabase security rules.

---

## 6. API Route Catalog & Specifications

| Endpoint | Method | Models / Engines | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/materials/upload` | `POST` | `pdf-parse`, Supabase Storage | Uploads PDF, extracts text, stores file in bucket, creates material row. |
| `/api/ai/topic-generate` | `POST` | `gemini-3.5-flash-lite` | Generates a structured multi-section study guide for bare topics. |
| `/api/ai/concept-extract` | `POST` | `gemini-3.1-flash-lite` | Extracts 4–8 discrete concepts with descriptions and location markers. |
| `/api/ai/audio-overview` | `POST` | `gemini-2.5-flash` | Synthesizes a conversational audio summary of the material. |
| `/api/chat/route.ts` | `POST` | `gemini-3.5-flash-lite` (Vercel AI SDK) | Streams contextual assistant responses for study queries. |
| `/api/chat/explain` | `POST` | `gemini-3.5-flash-lite` | Provides targeted explanations, examples, hints, and quiz questions. |
| `/api/ai/recall-generate` | `POST` | `gemini-3.5-flash-lite` | Generates a concept-targeted active recall question. |
| `/api/ai/recall-grade` | `POST` | `gemini-3.7-flash` | Evaluates recall responses (accuracy, completeness, misconceptions). |
| `/api/ai/report-synthesize` | `POST` | `gemini-3.7-flash` | Analyzes all session attempts and generates a comprehensive report. |
| `/api/ai/hallucination-generate` | `POST` | `gemini-3.5-flash-lite` | Creates 2 truths and 1 subtle AI hallucination. |
| `/api/ai/hallucination-grade` | `POST` | `gemini-3.7-flash` | Verifies user's selection against the server-stored answer and grades explanation. |
| `/api/ai/teach-back-transcribe` | `POST` | `gemini-2.5-flash` / Multimodal Audio | Transcribes audio recordings into clean text. |
| `/api/ai/teach-back-grade` | `POST` | `gemini-3.7-flash` | Evaluates teach-back submissions across 3 scoring dimensions. |
| `/api/ai/teach-back-audio` | `POST` | `gemini-2.5-flash` | Synthesizes spoken audio feedback for teach-back evaluations. |
| `/api/ai/enigma-generate` | `POST` | `gemini-3.5-flash-lite` | Generates 5 progressive diagnostic clues for Concept Enigma. |

---

## 7. Quality Assurance & Verification Summary

The codebase has undergone full verification:
1. **Production Build Verification**: Executed `npm run build` with Turbopack — all 23 static and dynamic routes compiled with **0 errors**.
2. **Type-Safety Audit**: Full project compilation verified with `tsc --noEmit`.
3. **UX & Accessibility**: Complete modal coverage (zero native alerts/confirms), drag-and-drop file upload, keyboard accessibility, and clean responsive layout.
4. **Security**: Row-level multi-tenancy verified across all database operations. Server-side validation on all assessment answer keys.
