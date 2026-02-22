# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (Next.js on port 3000)
npm run build    # Build production bundle
npm run start    # Start production server
npm run lint     # Run ESLint
npx convex dev   # Start Convex backend (required alongside Next.js dev)
```

No test runner is configured.

## Architecture Overview

Grove is a personal knowledge platform with AI-powered note-taking. It is a full-stack app using:

- **Next.js 16** (App Router) — frontend
- **Convex** — serverless real-time backend + database (replaces REST APIs and traditional ORM)
- **BlockNote** — block-based rich text editor
- **Mantine** — UI component library
- **Tailwind CSS 4** — utility styling
- **Anthropic Claude SDK** — AI features (block classification, chat, AI comments)

## Data Flow

All data operations go through Convex, not REST or GraphQL:

```
Frontend component
  → useMutation / useQuery hooks (convex/react)
  → convex/*.ts backend functions (queries, mutations, internalActions)
  → Convex database (real-time subscriptions auto-update frontend)
```

AI features use Convex scheduled actions that call the Anthropic API server-side, then write results back to the database. The frontend sees AI results reactively through `useQuery`.

## Backend Structure (`convex/`)

All backend logic lives in `convex/`. Function types:
- **Queries** (`query`) — read-only, callable via `useQuery` on frontend
- **Mutations** (`mutation`) — writes, callable via `useMutation` on frontend
- **Internal Actions** (`internalAction`) — server-side only, used for Anthropic API calls

Key files:
- `convex/schema.ts` — defines all tables: `notes`, `comments`, `blockTags`, `chatMessages`
- `convex/notes.ts` — note CRUD
- `convex/comments.ts` — comment CRUD (supports nested replies via `parentId`)
- `convex/tags.ts` — block tag mutations
- `convex/chat.ts` — chat message storage and retrieval
- `convex/ai.ts` — three AI internal actions: `classifyBlocks`, `generateChatResponse`, `generateAIComment`

Convex uses `ctx.db` directly (no ORM). Arguments are validated with the `v` validator object. IDs are typed as `Id<"tableName">`.

## Frontend Structure (`src/`)

```
src/app/                    # Next.js App Router
  layout.tsx                # Root layout — wraps app with ConvexClientProvider
  page.tsx                  # Home: lists notes or redirects to first note
  note/[noteId]/
    page.tsx                # Dynamic note route
    NoteWorkspace.tsx       # Orchestrates editor + sidebars

src/components/
  layout/                   # AppShell (3-column layout), Sidebar (notes list)
  editor/                   # Editor (BlockNote + Grove theme), EditorHeader (title)
  ai/                       # AISidebar, AIChatMessage, AIChatInput, AITagBadge
  comments/                 # CommentPopover (appears on text selection), CommentThread

src/hooks/
  useTextSelection.ts       # Tracks selected text range for comment popover

src/lib/
  ai-provider.ts            # ClaudeProvider class, tag type definitions and colors
  utils.ts                  # debounce, format helpers
```

The layout is a 3-column shell: left sidebar (notes list) + center editor + right AI/comments sidebar. The right panel is hidden below `lg` breakpoint.

## Key Conventions

**Auto-save**: Editor content is debounced 1000ms before writing to Convex. Title saves on blur or Enter.

**AI model**: `claude-sonnet-4-20250514` — defined in `src/lib/ai-provider.ts` and `convex/ai.ts`. Anthropic API key must be set as `ANTHROPIC_API_KEY` in Convex environment variables (not `.env.local`).

**Design tokens**: Global CSS custom properties defined in `src/app/globals.css`. Deep blue dark mode with grain texture. Custom fonts: Geist Sans (body), Geist Mono (code), Cormorant Garamond (display). Components mix Tailwind classes with inline CSS variables.

**BlockNote content**: Note content stored as BlockNote JSON (`any` type in schema). Block IDs from BlockNote are used as foreign keys in `comments` and `blockTags` tables.

**Tag types**: `"claim" | "question" | "action_item" | "source_needed" | "idea" | "reference" | "definition" | "counterpoint"` — defined in `src/lib/ai-provider.ts`.

**Path alias**: `@/*` maps to `./src/*`.

**No authentication**: App is single-user, no auth layer.
