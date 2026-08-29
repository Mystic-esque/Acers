# Acers Architecture

This document tracks architectural decisions, data models, and the system design for Acers.

## Tech Stack
- **Framework:** Next.js (App Router)
- **Database / Auth:** Supabase (Postgres, Auth, Storage)
- **Styling:** Tailwind CSS + shadcn/ui
- **AI:** Google Gemini API (Gemini 3.5 Lite)

## Next.js Route Structure
- `/` - Landing Page (Marketing)
- `/login` - Authentication
- `/library` - Dashboard showing available study materials
- `/materials/new` - Form to upload new materials (PDFs) or bare topics
- `/materials/[id]/study` - Two-pane Study Workspace
- `/materials/[id]/report/[sessionId]` - Study Report
- `/concepts/[id]/assess` - Assessment Hub (Teach it back, AI Hallucination, Progressive Case)
- `/concepts/[id]/profile` - Learning Profile metrics

## Database Design
The schema uses Supabase Postgres with strict Row Level Security (RLS) policies. Every table must include a `user_id` column that ties to `auth.users(id)` and an RLS policy asserting `auth.uid() = user_id`.

## State Management
- **Client State:** React state (`useState`) is used for transient UI concerns (modals, dropdowns, forms).
- **Server State:** Supabase database acts as the single source of truth. Long-running drafts (like the progressive case state) are saved to the server as draft rows (`status = 'in_progress'`) to survive page reloads and protect answers from the client.
- **AI Calls:** All LLM calls are server-side Next.js route handlers or Server Actions. The client never holds API keys or contacts Gemini directly.
