# Lore Agent & Agent-First View — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Lore (global knowledge agent with tool use, web search, and persistent sessions) alongside Quill (upgraded to agentic loop), a `/chat` route as the agent-first view, and full observability via a tool call + thinking inspector.

**Architecture:** Notes keep `content: v.any()` as the BlockNote editor's source of truth. A `blocks` table is populated async as a denormalized search index for AI. Lore runs as a Convex `"use node"` internalAction using Anthropic's tool_use agentic loop. New tables: `blocks`, `suggestedEdits`, `loreConversations`, `loreChatMessages`.

**Tech Stack:** Next.js 16 App Router, Convex, BlockNote, `@anthropic-ai/sdk`, `@tavily/core`, Tailwind CSS v4 + CSS custom properties (deep blue dark theme).

---

## Reading Before Starting

- Design doc: `docs/plans/2026-02-22-lore-agent-design.md`
- Current schema: `convex/schema.ts`
- Current AI actions: `convex/ai.ts`
- Current note editor: `src/components/editor/Editor.tsx`
- Layout shell: `src/components/layout/AppShell.tsx`, `Sidebar.tsx`
- CSS variables: `src/app/globals.css` (use `var(--grove-*)` throughout, never hardcode colors)

---

## Task 1: Extend Convex Schema

**Files:**
- Modify: `convex/schema.ts`

**Step 1: Replace the schema**

Open `convex/schema.ts` and replace it entirely with:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ── Notes ─────────────────────────────────────────────────────
  notes: defineTable({
    title: v.string(),
    content: v.any(),                    // BlockNote JSON array (editor source of truth)
    managedBy: v.union(v.literal("ai"), v.literal("user")), // default "ai"
    createdAt: v.number(),
    updatedAt: v.number(),
    lastTaggedAt: v.optional(v.number()),
  })
    .index("by_updatedAt", ["updatedAt"])
    .index("by_createdAt", ["createdAt"]),

  // ── Blocks (denormalized AI read model) ───────────────────────
  blocks: defineTable({
    noteId: v.id("notes"),
    blockId: v.string(),          // BlockNote's own stable ID
    type: v.string(),             // paragraph, heading, bulletListItem, etc.
    content: v.any(),             // BlockNote content array for this block
    props: v.optional(v.any()),
    parentId: v.optional(v.string()),
    order: v.number(),            // float — position in note
    text: v.string(),             // extracted plain text for search
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_noteId", ["noteId"])
    .index("by_noteId_order", ["noteId", "order"])
    .index("by_blockId", ["blockId"]),

  // ── Suggested Edits ───────────────────────────────────────────
  suggestedEdits: defineTable({
    noteId: v.id("notes"),
    sessionId: v.optional(v.id("loreConversations")),
    editType: v.union(
      v.literal("create_note"),
      v.literal("add_block"),
      v.literal("update_block"),
      v.literal("delete_block"),
      v.literal("update_title")
    ),
    blockId: v.optional(v.string()),
    before: v.optional(v.any()),
    after: v.optional(v.any()),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected")
    ),
    createdAt: v.number(),
  })
    .index("by_noteId", ["noteId"])
    .index("by_status", ["status"]),

  // ── Comments ──────────────────────────────────────────────────
  comments: defineTable({
    noteId: v.id("notes"),
    blockId: v.string(),
    selectionStart: v.optional(v.number()),
    selectionEnd: v.optional(v.number()),
    selectedText: v.optional(v.string()),
    author: v.union(v.literal("user"), v.literal("ai")),
    body: v.string(),
    parentId: v.optional(v.id("comments")),
    resolved: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_noteId", ["noteId"])
    .index("by_noteId_blockId", ["noteId", "blockId"])
    .index("by_parentId", ["parentId"]),

  // ── Block Tags ────────────────────────────────────────────────
  blockTags: defineTable({
    noteId: v.id("notes"),
    blockId: v.string(),
    tag: v.union(
      v.literal("claim"),
      v.literal("question"),
      v.literal("action_item"),
      v.literal("source_needed"),
      v.literal("idea"),
      v.literal("reference"),
      v.literal("definition"),
      v.literal("counterpoint")
    ),
    confidence: v.number(),
    createdAt: v.number(),
  })
    .index("by_noteId", ["noteId"])
    .index("by_noteId_blockId", ["noteId", "blockId"]),

  // ── Quill Chat (per-note) ─────────────────────────────────────
  chatMessages: defineTable({
    noteId: v.id("notes"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    thinkingContent: v.optional(v.string()),
    toolCalls: v.optional(v.array(v.object({
      toolName: v.string(),
      input: v.any(),
      output: v.any(),
      durationMs: v.optional(v.number()),
    }))),
    blockReferences: v.optional(v.array(v.string())),
    createdAt: v.number(),
  })
    .index("by_noteId", ["noteId"])
    .index("by_noteId_createdAt", ["noteId", "createdAt"]),

  // ── Lore Conversations ────────────────────────────────────────
  loreConversations: defineTable({
    title: v.string(),
    summary: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_updatedAt", ["updatedAt"]),

  // ── Lore Chat Messages (per-session) ─────────────────────────
  loreChatMessages: defineTable({
    sessionId: v.id("loreConversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    thinkingContent: v.optional(v.string()),
    toolCalls: v.optional(v.array(v.object({
      toolName: v.string(),
      input: v.any(),
      output: v.any(),
      durationMs: v.optional(v.number()),
    }))),
    createdAt: v.number(),
  })
    .index("by_sessionId", ["sessionId"])
    .index("by_sessionId_createdAt", ["sessionId", "createdAt"]),
});
```

**Step 2: Update existing notes — add managedBy default**

In `convex/notes.ts`, update the `create` mutation to include `managedBy: "ai"`:

```typescript
// in the create mutation handler, add to the insert:
managedBy: "ai" as const,
```

**Step 3: Verify schema compiles**

```bash
cd /home/ishnoor/dev/grove && npx convex dev --once 2>&1 | tail -20
```
Expected: `✓ Schema validated` or similar, no type errors.

**Step 4: Commit**

```bash
git add convex/schema.ts convex/notes.ts
git commit -m "feat: extend schema with blocks, suggestedEdits, lore tables, managedBy"
```

---

## Task 2: Create `convex/blocks.ts`

**Files:**
- Create: `convex/blocks.ts`

This module manages the blocks denormalized index. Lore uses it for `search_notes` and `read_note`.

**Step 1: Create the file**

```typescript
import {
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { v } from "convex/values";

// Called after a note's content changes — syncs blocks table
export const syncFromNote = internalMutation({
  args: {
    noteId: v.id("notes"),
    blocks: v.array(v.object({
      blockId: v.string(),
      type: v.string(),
      content: v.any(),
      props: v.optional(v.any()),
      parentId: v.optional(v.string()),
      order: v.number(),
      text: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    // Delete existing blocks for this note
    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_noteId", (q) => q.eq("noteId", args.noteId))
      .collect();
    for (const b of existing) await ctx.db.delete(b._id);

    // Insert new blocks
    const now = Date.now();
    for (const b of args.blocks) {
      await ctx.db.insert("blocks", {
        noteId: args.noteId,
        blockId: b.blockId,
        type: b.type,
        content: b.content,
        props: b.props,
        parentId: b.parentId,
        order: b.order,
        text: b.text,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Search blocks by text (case-insensitive substring match)
export const search = internalQuery({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const q = args.query.toLowerCase();
    const all = await ctx.db.query("blocks").collect();
    return all
      .filter((b) => b.text.toLowerCase().includes(q))
      .slice(0, 20)
      .map((b) => ({
        noteId: b.noteId,
        blockId: b.blockId,
        text: b.text,
        type: b.type,
      }));
  },
});

// Get all blocks for a note ordered by position
export const listByNote = internalQuery({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("blocks")
      .withIndex("by_noteId_order", (q) => q.eq("noteId", args.noteId))
      .order("asc")
      .collect();
  },
});
```

**Step 2: Verify**

```bash
npx convex dev --once 2>&1 | tail -10
```
Expected: no errors.

**Step 3: Commit**

```bash
git add convex/blocks.ts
git commit -m "feat: add blocks Convex module for AI search index"
```

---

## Task 3: Wire Block Sync into `convex/ai.ts`

**Files:**
- Modify: `convex/ai.ts`

When `classifyBlocks` runs (triggered on every note save), also sync the blocks table.

**Step 1: Add a `syncBlocks` internalAction**

At the bottom of `convex/ai.ts`, after the existing actions, add:

```typescript
// ---------------------------------------------------------------------------
// Action 4 – syncBlocks (keeps blocks table in sync with note content)
// ---------------------------------------------------------------------------

export const syncBlocks = internalAction({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    try {
      const note = await ctx.runQuery(internal.notes.getInternal, {
        noteId: args.noteId,
      });
      if (!note?.content) return;

      const rawBlocks = note.content as any[];
      const synced = flattenBlocks(rawBlocks, 0);
      await ctx.runMutation(internal.blocks.syncFromNote, {
        noteId: args.noteId,
        blocks: synced,
      });
    } catch (e) {
      console.error("syncBlocks failed:", e);
    }
  },
});

function flattenBlocks(
  blocks: any[],
  startOrder: number,
  parentId?: string
): Array<{
  blockId: string;
  type: string;
  content: any;
  props?: any;
  parentId?: string;
  order: number;
  text: string;
}> {
  const result: ReturnType<typeof flattenBlocks> = [];
  blocks.forEach((block, i) => {
    const text = (block.content ?? [])
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("");
    result.push({
      blockId: block.id,
      type: block.type,
      content: block.content,
      props: block.props,
      parentId,
      order: startOrder + i,
      text,
    });
    if (block.children?.length) {
      result.push(
        ...flattenBlocks(block.children, startOrder + i + 0.1, block.id)
      );
    }
  });
  return result;
}
```

**Step 2: Trigger syncBlocks from notes.ts**

In `convex/notes.ts`, in the `update` mutation handler, after scheduling `classifyBlocks`, also schedule `syncBlocks`:

```typescript
await ctx.scheduler.runAfter(0, internal.ai.syncBlocks, {
  noteId: args.noteId,
});
```

Also add the import at the top of `convex/notes.ts` if `internal` isn't already imported (it already is).

**Step 3: Verify**

```bash
npx convex dev --once 2>&1 | tail -10
```
Expected: no type errors.

**Step 4: Commit**

```bash
git add convex/ai.ts convex/notes.ts
git commit -m "feat: sync blocks table on every note save"
```

---

## Task 4: Create `convex/loreConversations.ts`

**Files:**
- Create: `convex/loreConversations.ts`

```typescript
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("loreConversations")
      .withIndex("by_updatedAt")
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { sessionId: v.id("loreConversations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    return await ctx.db.insert("loreConversations", {
      title: "New conversation",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateTitle = internalMutation({
  args: {
    sessionId: v.id("loreConversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { sessionId: v.id("loreConversations") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("loreChatMessages")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    for (const m of messages) await ctx.db.delete(m._id);
    await ctx.db.delete(args.sessionId);
  },
});
```

**Verify + Commit:**

```bash
npx convex dev --once 2>&1 | tail -10
git add convex/loreConversations.ts
git commit -m "feat: add loreConversations Convex module"
```

---

## Task 5: Create `convex/loreChatMessages.ts`

**Files:**
- Create: `convex/loreChatMessages.ts`

```typescript
import { query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

const toolCallSchema = v.object({
  toolName: v.string(),
  input: v.any(),
  output: v.any(),
  durationMs: v.optional(v.number()),
});

export const listBySession = query({
  args: { sessionId: v.id("loreConversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("loreChatMessages")
      .withIndex("by_sessionId_createdAt", (q) =>
        q.eq("sessionId", args.sessionId)
      )
      .order("asc")
      .collect();
  },
});

export const listBySessionInternal = internalQuery({
  args: { sessionId: v.id("loreConversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("loreChatMessages")
      .withIndex("by_sessionId_createdAt", (q) =>
        q.eq("sessionId", args.sessionId)
      )
      .order("asc")
      .collect();
  },
});

export const saveUserMessage = internalMutation({
  args: {
    sessionId: v.id("loreConversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("loreChatMessages", {
      sessionId: args.sessionId,
      role: "user",
      content: args.content,
      createdAt: Date.now(),
    });
  },
});

export const saveAssistantMessage = internalMutation({
  args: {
    sessionId: v.id("loreConversations"),
    content: v.string(),
    thinkingContent: v.optional(v.string()),
    toolCalls: v.optional(v.array(toolCallSchema)),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("loreChatMessages", {
      sessionId: args.sessionId,
      role: "assistant",
      content: args.content,
      thinkingContent: args.thinkingContent,
      toolCalls: args.toolCalls,
      createdAt: Date.now(),
    });
  },
});
```

**Verify + Commit:**

```bash
npx convex dev --once 2>&1 | tail -10
git add convex/loreChatMessages.ts
git commit -m "feat: add loreChatMessages Convex module"
```

---

## Task 6: Create `convex/suggestedEdits.ts`

**Files:**
- Create: `convex/suggestedEdits.ts`

```typescript
import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const listByNote = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("suggestedEdits")
      .withIndex("by_noteId", (q) => q.eq("noteId", args.noteId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
  },
});

export const createSuggestion = internalMutation({
  args: {
    noteId: v.id("notes"),
    sessionId: v.optional(v.id("loreConversations")),
    editType: v.union(
      v.literal("create_note"),
      v.literal("add_block"),
      v.literal("update_block"),
      v.literal("delete_block"),
      v.literal("update_title")
    ),
    blockId: v.optional(v.string()),
    before: v.optional(v.any()),
    after: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("suggestedEdits", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const accept = mutation({
  args: { editId: v.id("suggestedEdits") },
  handler: async (ctx, args) => {
    const edit = await ctx.db.get(args.editId);
    if (!edit) throw new Error("Edit not found");

    // Apply the edit
    if (edit.editType === "update_title" && edit.after?.title) {
      await ctx.db.patch(edit.noteId, { title: edit.after.title, updatedAt: Date.now() });
    } else if (
      (edit.editType === "update_block" ||
        edit.editType === "add_block" ||
        edit.editType === "delete_block") &&
      edit.after?.content !== undefined
    ) {
      // After is the full new note content array
      await ctx.db.patch(edit.noteId, {
        content: edit.after.content,
        updatedAt: Date.now(),
      });
    }

    await ctx.db.patch(args.editId, { status: "accepted" });
  },
});

export const reject = mutation({
  args: { editId: v.id("suggestedEdits") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.editId, { status: "rejected" });
  },
});
```

**Verify + Commit:**

```bash
npx convex dev --once 2>&1 | tail -10
git add convex/suggestedEdits.ts
git commit -m "feat: add suggestedEdits Convex module with accept/reject"
```

---

## Task 7: Add listInternal to `convex/notes.ts`

Lore needs an internal query to list all notes.

**Files:**
- Modify: `convex/notes.ts`

**Step 1: Add at the bottom of notes.ts**

```typescript
export const listInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("notes")
      .withIndex("by_updatedAt")
      .order("desc")
      .collect();
  },
});

export const updateContent = internalMutation({
  args: {
    noteId: v.id("notes"),
    content: v.any(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: any = { content: args.content, updatedAt: Date.now() };
    if (args.title !== undefined) patch.title = args.title;
    await ctx.db.patch(args.noteId, patch);
  },
});

export const updateManagement = mutation({
  args: {
    noteId: v.id("notes"),
    managedBy: v.union(v.literal("ai"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.noteId, { managedBy: args.managedBy });
  },
});
```

**Step 2: Add the internalQuery import** — make sure the import line at the top includes `internalQuery` and `internalMutation`:

```typescript
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";
```

**Verify + Commit:**

```bash
npx convex dev --once 2>&1 | tail -10
git add convex/notes.ts
git commit -m "feat: add listInternal, updateContent, updateManagement to notes"
```

---

## Task 8: Install Tavily + Set Env Var

**Step 1: Install SDK**

```bash
cd /home/ishnoor/dev/grove && npm install @tavily/core
```

**Step 2: Set env var (user provides key — use placeholder for now)**

```bash
npx convex env set TAVILY_API_KEY tvly-YOUR-KEY-HERE
```

> Note: User must replace with a real Tavily API key from https://app.tavily.com. If no key, `web_search` will return a "not configured" message gracefully.

**Step 3: Commit package changes**

```bash
git add package.json package-lock.json
git commit -m "feat: install @tavily/core for web search"
```

---

## Task 9: Create `convex/lore.ts` — The Lore Agent

This is the core Lore action. It runs the full Anthropic tool_use agentic loop.

**Files:**
- Create: `convex/lore.ts`

```typescript
"use node";

import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";

const LORE_SYSTEM_PROMPT = `You are Lore, a knowledge agent inside Grove — a personal note-taking platform.
You have full access to the user's notes and can create, read, search, and edit them.
You can also search the web to bring in new information.

Personality: You are a capable chief-of-staff. Concise, thoughtful, proactive.
When editing notes, always describe what you did and why.
When referencing a note, mention its title.
When you create or edit a note, briefly summarize the change in your response.`;

const tools: Anthropic.Tool[] = [
  {
    name: "list_notes",
    description: "List all notes with their IDs, titles, and last updated time.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "read_note",
    description: "Read the full markdown content of a specific note.",
    input_schema: {
      type: "object" as const,
      properties: {
        noteId: { type: "string", description: "The note's Convex ID" },
      },
      required: ["noteId"],
    },
  },
  {
    name: "search_notes",
    description: "Search for blocks matching a text query across all notes.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Text to search for" },
      },
      required: ["query"],
    },
  },
  {
    name: "create_note",
    description: "Create a new note with a title and optional initial content.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        content: {
          type: "string",
          description: "Initial markdown content (optional)",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "update_note",
    description:
      "Replace the full content of a note. Use this to add, edit, or reorganize content. Provide the complete new markdown — it will be converted to blocks.",
    input_schema: {
      type: "object" as const,
      properties: {
        noteId: { type: "string" },
        markdown: {
          type: "string",
          description: "The complete new note content in markdown",
        },
        title: {
          type: "string",
          description: "New title (optional — omit to keep existing)",
        },
      },
      required: ["noteId", "markdown"],
    },
  },
  {
    name: "update_title",
    description: "Rename a note.",
    input_schema: {
      type: "object" as const,
      properties: {
        noteId: { type: "string" },
        title: { type: "string" },
      },
      required: ["noteId", "title"],
    },
  },
  {
    name: "web_search",
    description: "Search the web for current information.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string" },
      },
      required: ["query"],
    },
  },
];

// ─── Markdown → BlockNote JSON conversion ────────────────────────────────────

function markdownToBlocks(markdown: string): any[] {
  const lines = markdown.split("\n").filter((l) => l.trim());
  return lines.map((line, i) => {
    const id = `lore-${Date.now()}-${i}`;
    if (line.startsWith("### "))
      return makeBlock(id, "heading", line.slice(4), { level: 3 });
    if (line.startsWith("## "))
      return makeBlock(id, "heading", line.slice(3), { level: 2 });
    if (line.startsWith("# "))
      return makeBlock(id, "heading", line.slice(2), { level: 1 });
    if (line.startsWith("- "))
      return makeBlock(id, "bulletListItem", line.slice(2));
    if (line.match(/^\d+\. /))
      return makeBlock(id, "numberedListItem", line.replace(/^\d+\. /, ""));
    if (line.startsWith("> "))
      return makeBlock(id, "quote", line.slice(2));
    return makeBlock(id, "paragraph", line);
  });
}

function makeBlock(id: string, type: string, text: string, props?: any): any {
  return {
    id,
    type,
    props: {
      textColor: "default",
      backgroundColor: "default",
      textAlignment: "left",
      ...props,
    },
    content: text
      ? [{ type: "text", text, styles: {} }]
      : [],
    children: [],
  };
}

function blocksToMarkdown(blocks: any[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    const text =
      block.content
        ?.filter((c: any) => c.type === "text")
        .map((c: any) => c.text)
        .join("") || "";
    switch (block.type) {
      case "heading": {
        const level = block.props?.level || 1;
        lines.push(`${"#".repeat(level)} ${text}`);
        break;
      }
      case "bulletListItem": lines.push(`- ${text}`); break;
      case "numberedListItem": lines.push(`1. ${text}`); break;
      case "quote": lines.push(`> ${text}`); break;
      default: if (text) lines.push(text); break;
    }
    if (block.children?.length) lines.push(blocksToMarkdown(block.children));
  }
  return lines.join("\n\n");
}

// ─── Main Lore action ─────────────────────────────────────────────────────────

export const run = internalAction({
  args: {
    sessionId: v.id("loreConversations"),
    userMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Build history from DB
    const history = await ctx.runQuery(
      internal.loreChatMessages.listBySessionInternal,
      { sessionId: args.sessionId }
    );

    const messages: Anthropic.MessageParam[] = [
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: args.userMessage },
    ];

    // Save user message
    await ctx.runMutation(internal.loreChatMessages.saveUserMessage, {
      sessionId: args.sessionId,
      content: args.userMessage,
    });

    const recordedToolCalls: Array<{
      toolName: string;
      input: any;
      output: any;
      durationMs: number;
    }> = [];
    let thinkingContent: string | undefined;
    let finalResponse = "";

    // Agentic loop
    while (true) {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: LORE_SYSTEM_PROMPT,
        tools,
        messages,
      });

      // Capture thinking
      const thinkingBlock = response.content.find((b) => b.type === "thinking");
      if (thinkingBlock && "thinking" in thinkingBlock) {
        thinkingContent = thinkingBlock.thinking as string;
      }

      if (response.stop_reason === "end_turn") {
        const textBlock = response.content.find((b) => b.type === "text");
        if (textBlock && "text" in textBlock) finalResponse = textBlock.text;
        break;
      }

      if (response.stop_reason === "tool_use") {
        const toolUseBlocks = response.content.filter(
          (b) => b.type === "tool_use"
        );
        messages.push({ role: "assistant", content: response.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of toolUseBlocks) {
          if (block.type !== "tool_use") continue;

          const start = Date.now();
          let result: any;

          try {
            result = await runTool(ctx, block.name, block.input as any);
          } catch (e: any) {
            result = { error: e.message };
          }

          recordedToolCalls.push({
            toolName: block.name,
            input: block.input,
            output: result,
            durationMs: Date.now() - start,
          });

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }

        messages.push({ role: "user", content: toolResults });
      } else {
        // Unexpected stop reason
        break;
      }
    }

    // Auto-title session after first exchange
    if (history.length === 0) {
      const titlePrompt = `Generate a short 4-6 word title for a conversation that starts with: "${args.userMessage}". Reply with ONLY the title, no quotes.`;
      const titleResp = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 20,
        messages: [{ role: "user", content: titlePrompt }],
      });
      const title =
        titleResp.content[0].type === "text"
          ? titleResp.content[0].text.trim()
          : "Conversation";
      await ctx.runMutation(internal.loreConversations.updateTitle, {
        sessionId: args.sessionId,
        title,
      });
    }

    // Save assistant message
    await ctx.runMutation(internal.loreChatMessages.saveAssistantMessage, {
      sessionId: args.sessionId,
      content: finalResponse,
      thinkingContent,
      toolCalls: recordedToolCalls,
    });
  },
});

// ─── Tool execution ───────────────────────────────────────────────────────────

async function runTool(ctx: any, toolName: string, input: any): Promise<any> {
  switch (toolName) {
    case "list_notes": {
      const notes = await ctx.runQuery(internal.notes.listInternal, {});
      return notes.map((n: any) => ({
        id: n._id,
        title: n.title,
        managedBy: n.managedBy ?? "ai",
        updatedAt: n.updatedAt,
      }));
    }

    case "read_note": {
      const note = await ctx.runQuery(internal.notes.getInternal, {
        noteId: input.noteId,
      });
      if (!note) return { error: "Note not found" };
      return {
        id: note._id,
        title: note.title,
        managedBy: note.managedBy ?? "ai",
        content: blocksToMarkdown(note.content ?? []),
      };
    }

    case "search_notes": {
      const results = await ctx.runQuery(internal.blocks.search, {
        query: input.query,
      });
      return results;
    }

    case "create_note": {
      const content = input.content
        ? markdownToBlocks(input.content)
        : [makeBlock("initial", "paragraph", "")];
      const noteId = await ctx.runMutation(internal.notes.updateContent, {
        noteId: await ctx.runMutation(internal.notes.createInternal, {
          title: input.title,
        }),
        content,
      });
      return { success: true, noteId };
    }

    case "update_note": {
      const note = await ctx.runQuery(internal.notes.getInternal, {
        noteId: input.noteId,
      });
      if (!note) return { error: "Note not found" };

      const newContent = markdownToBlocks(input.markdown);
      const managedBy = note.managedBy ?? "ai";

      if (managedBy === "ai") {
        await ctx.runMutation(internal.notes.updateContent, {
          noteId: input.noteId,
          content: newContent,
          title: input.title,
        });
        return { success: true, blocksUpdated: newContent.length };
      } else {
        // Human-managed: create suggestion
        const editId = await ctx.runMutation(
          internal.suggestedEdits.createSuggestion,
          {
            noteId: input.noteId,
            editType: "update_block",
            before: { content: note.content, title: note.title },
            after: { content: newContent, title: input.title ?? note.title },
          }
        );
        return {
          pendingApproval: true,
          editId,
          message: `Suggested edit created for "${note.title}" — awaiting your approval.`,
        };
      }
    }

    case "update_title": {
      const note = await ctx.runQuery(internal.notes.getInternal, {
        noteId: input.noteId,
      });
      if (!note) return { error: "Note not found" };

      const managedBy = note.managedBy ?? "ai";
      if (managedBy === "ai") {
        await ctx.runMutation(internal.notes.updateContent, {
          noteId: input.noteId,
          content: note.content,
          title: input.title,
        });
        return { success: true };
      } else {
        const editId = await ctx.runMutation(
          internal.suggestedEdits.createSuggestion,
          {
            noteId: input.noteId,
            editType: "update_title",
            before: { title: note.title },
            after: { title: input.title },
          }
        );
        return { pendingApproval: true, editId };
      }
    }

    case "web_search": {
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey || apiKey.startsWith("tvly-YOUR")) {
        return { error: "Web search not configured (TAVILY_API_KEY missing)" };
      }
      const resp = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query: input.query,
          max_results: 5,
          include_answer: false,
        }),
      });
      const data = await resp.json();
      return {
        query: input.query,
        results: (data.results ?? []).map((r: any) => ({
          title: r.title,
          url: r.url,
          snippet: r.content?.slice(0, 300),
        })),
      };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ─── Public mutation to kick off Lore ────────────────────────────────────────

export const sendMessage = internalMutation({
  args: {
    sessionId: v.id("loreConversations"),
    userMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, internal.lore.run, {
      sessionId: args.sessionId,
      userMessage: args.userMessage,
    });
  },
});
```

**Step 2: Add `createInternal` to `convex/notes.ts`**

```typescript
export const createInternal = internalMutation({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("notes", {
      title: args.title,
      content: [],
      managedBy: "ai",
      createdAt: now,
      updatedAt: now,
    });
  },
});
```

**Step 3: Also add a public `sendLoreMessage` mutation in `convex/loreChatMessages.ts`** (called from frontend):

```typescript
export const send = mutation({
  args: {
    sessionId: v.id("loreConversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.scheduler.runAfter(0, internal.lore.run, {
      sessionId: args.sessionId,
      userMessage: args.content,
    });
  },
});
```

Add the import at the top of `loreChatMessages.ts`:
```typescript
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
```

**Step 4: Verify**

```bash
npx convex dev --once 2>&1 | tail -20
```
Expected: no type errors. (Note: Lore's `createInternal` tool call path has a small bug — `updateContent` returns void not a noteId. Fix: split create into two separate calls. See below.)

**Fix the create_note tool case:**

```typescript
case "create_note": {
  const content = input.content
    ? markdownToBlocks(input.content)
    : [makeBlock(`p-${Date.now()}`, "paragraph", "")];
  const noteId = await ctx.runMutation(internal.notes.createInternal, {
    title: input.title,
  });
  await ctx.runMutation(internal.notes.updateContent, {
    noteId,
    content,
  });
  return { success: true, noteId };
}
```

**Step 5: Commit**

```bash
git add convex/lore.ts convex/notes.ts convex/loreChatMessages.ts
git commit -m "feat: add Lore agent with full tool_use agentic loop"
```

---

## Task 10: Update `src/app/page.tsx` — Mobile Redirect

**Files:**
- Modify: `src/app/page.tsx`

Replace the redirect logic to send mobile users to `/chat`:

```typescript
// Add this hook near the top of the component, after existing hooks:
const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

// Replace the "notes exist" redirect:
useEffect(() => {
  if (notes && notes.length > 0) {
    const lastNote = localStorage.getItem("grove:lastNote");
    if (isMobile) {
      router.push("/chat");
    } else if (lastNote) {
      router.push(`/note/${lastNote}`);
    } else {
      router.push(`/note/${notes[0]._id}`);
    }
  }
}, [notes, router, isMobile]);
```

**Commit:**

```bash
git add src/app/page.tsx
git commit -m "feat: route mobile to /chat by default"
```

---

## Task 11: Create `/chat` and `/chat/[sessionId]` Routes

**Files:**
- Create: `src/app/chat/page.tsx`
- Create: `src/app/chat/[sessionId]/page.tsx`
- Create: `src/app/chat/[sessionId]/LoreWorkspace.tsx`

**`src/app/chat/page.tsx`** — creates a new session and redirects:

```typescript
"use client";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export default function ChatIndexPage() {
  const createSession = useMutation(api.loreConversations.create);
  const router = useRouter();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;
    createSession().then((id) => router.replace(`/chat/${id}`));
  }, [createSession, router]);

  return (
    <div
      className="flex h-screen items-center justify-center"
      style={{ background: "var(--grove-bg)" }}
    >
      <div
        className="text-xs animate-pulse tracking-[0.2em] uppercase"
        style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
      >
        Starting session...
      </div>
    </div>
  );
}
```

**`src/app/chat/[sessionId]/page.tsx`**:

```typescript
import LoreWorkspace from "./LoreWorkspace";

export default async function ChatSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <LoreWorkspace sessionId={sessionId} />;
}
```

**`src/app/chat/[sessionId]/LoreWorkspace.tsx`** — placeholder for now (full implementation in Task 17):

```typescript
"use client";
import LoreShell from "@/components/lore/LoreShell";

export default function LoreWorkspace({ sessionId }: { sessionId: string }) {
  return <LoreShell sessionId={sessionId} />;
}
```

**Commit:**

```bash
git add src/app/chat/
git commit -m "feat: add /chat and /chat/[sessionId] routes"
```

---

## Task 12: Build `ToolCallInspector` Component

**Files:**
- Create: `src/components/shared/ToolCallInspector.tsx`

```typescript
"use client";
import { useState } from "react";
import { ChevronRight, ChevronDown, Brain, Wrench } from "lucide-react";

interface ToolCall {
  toolName: string;
  input: any;
  output: any;
  durationMs?: number;
}

interface ToolCallInspectorProps {
  thinkingContent?: string;
  toolCalls?: ToolCall[];
}

export default function ToolCallInspector({
  thinkingContent,
  toolCalls,
}: ToolCallInspectorProps) {
  const [open, setOpen] = useState(false);
  const [expandedThinking, setExpandedThinking] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Record<number, boolean>>({});

  const stepCount = (thinkingContent ? 1 : 0) + (toolCalls?.length ?? 0);
  if (stepCount === 0) return null;

  const totalMs = toolCalls?.reduce((s, t) => s + (t.durationMs ?? 0), 0) ?? 0;

  return (
    <div
      className="mb-2 rounded-md overflow-hidden"
      style={{ border: "1px solid var(--grove-border)", background: "var(--grove-surface-2)" }}
    >
      {/* Summary row */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
        style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--grove-surface-3)"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
      >
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        <span className="text-[10px] tracking-[0.05em]">
          {stepCount} step{stepCount !== 1 ? "s" : ""}
          {totalMs > 0 && ` · ${(totalMs / 1000).toFixed(1)}s`}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-2 space-y-1.5">
          {/* Thinking */}
          {thinkingContent && (
            <div>
              <button
                onClick={() => setExpandedThinking((e) => !e)}
                className="flex items-center gap-1.5 text-[10px] w-full text-left py-1"
                style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
              >
                <Brain size={10} style={{ color: "var(--grove-accent)" }} />
                <span>thinking</span>
                {expandedThinking ? <ChevronDown size={9} /> : <span className="opacity-50">···</span>}
              </button>
              {expandedThinking && (
                <div
                  className="text-[10px] leading-relaxed p-2 rounded whitespace-pre-wrap"
                  style={{
                    background: "var(--grove-surface-3)",
                    color: "var(--grove-text-3)",
                    fontFamily: "var(--font-geist-mono)",
                    maxHeight: "200px",
                    overflowY: "auto",
                  }}
                >
                  {thinkingContent}
                </div>
              )}
            </div>
          )}

          {/* Tool calls */}
          {toolCalls?.map((tc, i) => (
            <div key={i}>
              <button
                onClick={() =>
                  setExpandedTools((t) => ({ ...t, [i]: !t[i] }))
                }
                className="flex items-center gap-1.5 text-[10px] w-full text-left py-1"
                style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
              >
                <Wrench size={10} style={{ color: "var(--grove-accent)" }} />
                <span style={{ color: "var(--grove-text-2)" }}>{tc.toolName}</span>
                <span className="opacity-50 ml-1 truncate max-w-[120px]">
                  {JSON.stringify(tc.input).slice(0, 40)}
                </span>
                {tc.durationMs && (
                  <span className="ml-auto opacity-40">{tc.durationMs}ms</span>
                )}
                {expandedTools[i] ? <ChevronDown size={9} /> : <ChevronRight size={9} />}
              </button>

              {expandedTools[i] && (
                <div className="space-y-1 pl-4">
                  <div
                    className="text-[10px] p-1.5 rounded"
                    style={{ background: "var(--grove-surface-3)", fontFamily: "var(--font-geist-mono)", color: "var(--grove-text-3)" }}
                  >
                    <span className="opacity-60">in:</span>{" "}
                    {JSON.stringify(tc.input, null, 2).slice(0, 200)}
                  </div>
                  <div
                    className="text-[10px] p-1.5 rounded"
                    style={{ background: "var(--grove-surface-3)", fontFamily: "var(--font-geist-mono)", color: "var(--grove-text-3)" }}
                  >
                    <span className="opacity-60">out:</span>{" "}
                    {JSON.stringify(tc.output, null, 2).slice(0, 400)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Commit:**

```bash
git add src/components/shared/ToolCallInspector.tsx
git commit -m "feat: add ToolCallInspector component"
```

---

## Task 13: Build `WebSearchCard` Component

**Files:**
- Create: `src/components/lore/WebSearchCard.tsx`

```typescript
"use client";
import { useState } from "react";
import { Search, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";

interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
}

interface WebSearchCardProps {
  query: string;
  results: SearchResult[];
}

export default function WebSearchCard({ query, results }: WebSearchCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="rounded-md overflow-hidden mb-2"
      style={{ border: "1px solid var(--grove-border)", background: "var(--grove-surface-2)" }}
    >
      {/* Header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
        style={{ borderBottom: collapsed ? "none" : "1px solid var(--grove-border)" }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--grove-surface-3)"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
      >
        <Search size={11} style={{ color: "var(--grove-accent)", flexShrink: 0 }} />
        <span
          className="text-[11px] flex-1 text-left italic truncate"
          style={{ color: "var(--grove-text-2)", fontFamily: "var(--font-geist-mono)" }}
        >
          "{query}"
        </span>
        <span
          className="text-[10px] mr-1"
          style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
        >
          {results.length} results
        </span>
        {collapsed ? (
          <ChevronRight size={11} style={{ color: "var(--grove-text-3)" }} />
        ) : (
          <ChevronDown size={11} style={{ color: "var(--grove-text-3)" }} />
        )}
      </button>

      {/* Results */}
      {!collapsed && (
        <div className="divide-y" style={{ borderColor: "var(--grove-border)" }}>
          {results.map((r, i) => (
            <a
              key={i}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 px-3 py-2 block transition-colors"
              style={{ textDecoration: "none" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--grove-surface-3)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
            >
              <img
                src={`https://www.google.com/s2/favicons?domain=${new URL(r.url).hostname}&sz=16`}
                alt=""
                className="w-4 h-4 mt-0.5 rounded-sm shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span
                    className="text-[11px] font-medium truncate"
                    style={{ color: "var(--grove-text)" }}
                  >
                    {r.title}
                  </span>
                  <ExternalLink size={9} style={{ color: "var(--grove-text-3)", flexShrink: 0 }} />
                </div>
                <div
                  className="text-[10px] mt-0.5"
                  style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
                >
                  {new URL(r.url).hostname}
                </div>
                {r.snippet && (
                  <p
                    className="text-[11px] mt-1 line-clamp-2 leading-relaxed"
                    style={{ color: "var(--grove-text-2)" }}
                  >
                    {r.snippet}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Commit:**

```bash
git add src/components/lore/WebSearchCard.tsx
git commit -m "feat: add WebSearchCard component"
```

---

## Task 14: Build `SuggestedEditDiffCard` Component

**Files:**
- Create: `src/components/lore/SuggestedEditDiffCard.tsx`

```typescript
"use client";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Check, X, FileEdit } from "lucide-react";

interface SuggestedEditDiffCardProps {
  editId: string;
  noteTitle: string;
  editType: string;
  before?: any;
  after?: any;
}

export default function SuggestedEditDiffCard({
  editId,
  noteTitle,
  editType,
  before,
  after,
}: SuggestedEditDiffCardProps) {
  const accept = useMutation(api.suggestedEdits.accept);
  const reject = useMutation(api.suggestedEdits.reject);

  const handleAccept = () => accept({ editId: editId as Id<"suggestedEdits"> });
  const handleReject = () => reject({ editId: editId as Id<"suggestedEdits"> });

  const label =
    editType === "update_title"
      ? `Rename "${before?.title}" → "${after?.title}"`
      : `Edit ${editType.replace("_", " ")} in "${noteTitle}"`;

  return (
    <div
      className="rounded-md overflow-hidden my-2"
      style={{ border: "1px solid var(--grove-border-2)", background: "var(--grove-surface-2)" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: "1px solid var(--grove-border)" }}
      >
        <FileEdit size={11} style={{ color: "var(--grove-accent)" }} />
        <span
          className="text-[11px] flex-1"
          style={{ color: "var(--grove-text-2)", fontFamily: "var(--font-geist-mono)" }}
        >
          {label}
        </span>
      </div>

      {/* Diff preview */}
      {before?.title !== undefined ? (
        <div className="px-3 py-2 space-y-1">
          <div
            className="text-[10px] px-2 py-1 rounded line-through opacity-60"
            style={{ background: "rgba(255,80,80,0.06)", color: "var(--grove-text-2)", fontFamily: "var(--font-geist-mono)" }}
          >
            {before.title}
          </div>
          <div
            className="text-[10px] px-2 py-1 rounded"
            style={{ background: "var(--grove-accent-dim)", color: "var(--grove-accent)", fontFamily: "var(--font-geist-mono)" }}
          >
            {after?.title}
          </div>
        </div>
      ) : after?.content ? (
        <div
          className="px-3 py-2 text-[10px] line-clamp-3"
          style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
        >
          {after.content
            .slice(0, 3)
            .map((b: any) =>
              b.content?.map((c: any) => c.text).join("") ?? ""
            )
            .join(" · ")}
        </div>
      ) : null}

      {/* Actions */}
      <div
        className="flex gap-2 px-3 py-2"
        style={{ borderTop: "1px solid var(--grove-border)" }}
      >
        <button
          onClick={handleAccept}
          className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded transition-colors"
          style={{
            background: "var(--grove-accent-dim)",
            border: "1px solid var(--grove-accent-border)",
            color: "var(--grove-accent)",
            fontFamily: "var(--font-geist-mono)",
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--grove-accent-glow)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "var(--grove-accent-dim)"}
        >
          <Check size={10} /> accept
        </button>
        <button
          onClick={handleReject}
          className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded transition-colors"
          style={{
            background: "rgba(255,80,80,0.06)",
            border: "1px solid rgba(255,80,80,0.15)",
            color: "rgba(255,120,120,0.8)",
            fontFamily: "var(--font-geist-mono)",
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,80,80,0.12)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,80,80,0.06)"}
        >
          <X size={10} /> reject
        </button>
      </div>
    </div>
  );
}
```

**Commit:**

```bash
git add src/components/lore/SuggestedEditDiffCard.tsx
git commit -m "feat: add SuggestedEditDiffCard component"
```

---

## Task 15: Build Lore Chat Components

**Files:**
- Create: `src/components/lore/LoreChatMessage.tsx`
- Create: `src/components/lore/LoreChatInput.tsx`
- Create: `src/components/lore/LoreSessionList.tsx`
- Create: `src/components/lore/LoreChat.tsx`
- Create: `src/components/lore/LoreShell.tsx`

**`LoreChatMessage.tsx`:**

```typescript
"use client";
import ToolCallInspector from "@/components/shared/ToolCallInspector";
import WebSearchCard from "./WebSearchCard";

interface LoreChatMessageProps {
  role: "user" | "assistant";
  content: string;
  thinkingContent?: string;
  toolCalls?: Array<{ toolName: string; input: any; output: any; durationMs?: number }>;
}

export default function LoreChatMessage({
  role,
  content,
  thinkingContent,
  toolCalls,
}: LoreChatMessageProps) {
  const isUser = role === "user";

  // Extract web search tool calls for rich rendering
  const webSearches = toolCalls?.filter((tc) => tc.toolName === "web_search" && tc.output?.results) ?? [];
  const otherToolCalls = toolCalls?.filter((tc) => tc.toolName !== "web_search") ?? [];
  const hasTrace = !!thinkingContent || otherToolCalls.length > 0;

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${isUser ? "" : "w-full"}`}>
        {/* Tool call inspector (non-search tools) */}
        {!isUser && hasTrace && (
          <ToolCallInspector
            thinkingContent={thinkingContent}
            toolCalls={otherToolCalls}
          />
        )}

        {/* Web search cards */}
        {!isUser && webSearches.map((ws, i) => (
          <WebSearchCard
            key={i}
            query={ws.input?.query ?? ""}
            results={ws.output?.results ?? []}
          />
        ))}

        {/* Message bubble */}
        <div
          className="p-3 rounded-lg text-xs leading-relaxed"
          style={
            isUser
              ? {
                  background: "var(--grove-surface-3)",
                  border: "1px solid var(--grove-border-2)",
                  color: "var(--grove-text)",
                }
              : {
                  background: "var(--grove-surface-2)",
                  border: "1px solid var(--grove-border)",
                  color: "var(--grove-text)",
                }
          }
        >
          <div
            className="text-[10px] font-semibold tracking-[0.1em] uppercase mb-1.5"
            style={{
              color: isUser ? "var(--grove-text-2)" : "var(--grove-accent)",
              fontFamily: "var(--font-geist-mono)",
            }}
          >
            {isUser ? "You" : "Lore"}
          </div>
          <div className="whitespace-pre-wrap">{content}</div>
        </div>
      </div>
    </div>
  );
}
```

**`LoreChatInput.tsx`:**

```typescript
"use client";
import { useState, useRef, type KeyboardEvent } from "react";
import { Send } from "lucide-react";

interface LoreChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function LoreChatInput({ onSend, disabled }: LoreChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setMessage("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="p-4 flex gap-2 items-end shrink-0"
      style={{ borderTop: "1px solid var(--grove-border)" }}
    >
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={() => {
          const el = textareaRef.current;
          if (el) { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 160)}px`; }
        }}
        placeholder="Ask Lore anything..."
        disabled={disabled}
        rows={1}
        className="flex-1 resize-none rounded-md px-3 py-2.5 text-sm focus:outline-none disabled:opacity-40"
        style={{
          background: "var(--grove-surface-2)",
          border: "1px solid var(--grove-border)",
          color: "var(--grove-text)",
          caretColor: "var(--grove-accent)",
        }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        className="shrink-0 rounded-md p-2.5 transition-all disabled:opacity-30"
        style={{
          background: "var(--grove-accent-dim)",
          border: "1px solid var(--grove-accent-border)",
          color: "var(--grove-accent)",
        }}
        onMouseEnter={e => { if (!disabled && message.trim()) (e.currentTarget as HTMLElement).style.background = "var(--grove-accent-glow)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--grove-accent-dim)"; }}
      >
        <Send size={15} />
      </button>
    </div>
  );
}
```

**`LoreSessionList.tsx`:**

```typescript
"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { Plus, Trash2, MessageSquare } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface LoreSessionListProps {
  currentSessionId: string;
}

export default function LoreSessionList({ currentSessionId }: LoreSessionListProps) {
  const sessions = useQuery(api.loreConversations.list);
  const createSession = useMutation(api.loreConversations.create);
  const removeSession = useMutation(api.loreConversations.remove);
  const router = useRouter();

  const handleNew = async () => {
    const id = await createSession();
    router.push(`/chat/${id}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await removeSession({ sessionId: id as Id<"loreConversations"> });
    if (id === currentSessionId) router.push("/chat");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid var(--grove-border)" }}
      >
        <span
          className="text-[10px] font-semibold tracking-[0.15em] uppercase"
          style={{ color: "var(--grove-text-2)", fontFamily: "var(--font-geist-mono)" }}
        >
          Lore
        </span>
        <button
          onClick={handleNew}
          className="p-1 rounded transition-colors"
          style={{ color: "var(--grove-text-3)" }}
          title="New conversation"
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--grove-accent)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--grove-text-3)"}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-2">
        {sessions?.map((session) => {
          const isActive = session._id === currentSessionId;
          return (
            <div
              key={session._id}
              onClick={() => router.push(`/chat/${session._id}`)}
              className="group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors relative"
              style={{
                background: isActive ? "var(--grove-surface-2)" : "transparent",
                borderLeft: isActive ? "2px solid var(--grove-accent)" : "2px solid transparent",
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--grove-surface-2)"; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <MessageSquare size={11} style={{ color: "var(--grove-text-3)", flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs truncate"
                  style={{ color: isActive ? "var(--grove-text)" : "var(--grove-text-2)" }}
                >
                  {session.title}
                </p>
                <p
                  className="text-[10px]"
                  style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
                >
                  {formatRelativeTime(session.updatedAt)}
                </p>
              </div>
              <button
                onClick={(e) => handleDelete(e, session._id)}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded transition-all"
                style={{ color: "var(--grove-text-3)" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "rgba(255,100,100,0.7)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--grove-text-3)"}
              >
                <Trash2 size={11} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**`LoreChat.tsx`** — the main chat panel:

```typescript
"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useEffect, useRef, useState } from "react";
import LoreChatMessage from "./LoreChatMessage";
import LoreChatInput from "./LoreChatInput";
import { Sparkles } from "lucide-react";

interface LoreChatProps {
  sessionId: string;
}

export default function LoreChat({ sessionId }: LoreChatProps) {
  const typedId = sessionId as Id<"loreConversations">;
  const messages = useQuery(api.loreChatMessages.listBySession, { sessionId: typedId });
  const send = useMutation(api.loreChatMessages.send);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (messages?.length && messages[messages.length - 1].role === "assistant") {
      setSending(false);
    }
  }, [messages]);

  const handleSend = async (content: string) => {
    setSending(true);
    try {
      await send({ sessionId: typedId, content });
    } catch {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {(!messages || messages.length === 0) && (
          <div
            className="flex flex-col items-center justify-center h-full gap-4 text-center"
            style={{ color: "var(--grove-text-3)" }}
          >
            <Sparkles size={32} style={{ color: "var(--grove-accent-border)" }} />
            <div>
              <p className="text-sm" style={{ color: "var(--grove-text-2)" }}>
                Hi, I'm Lore.
              </p>
              <p className="text-xs mt-1" style={{ fontFamily: "var(--font-geist-mono)" }}>
                I can manage your notes, search the web, and answer questions across your knowledge base.
              </p>
            </div>
          </div>
        )}

        {messages?.map((msg) => (
          <LoreChatMessage
            key={msg._id}
            role={msg.role}
            content={msg.content}
            thinkingContent={msg.thinkingContent}
            toolCalls={msg.toolCalls}
          />
        ))}

        {sending && (
          <div className="flex justify-start">
            <div
              className="rounded-lg p-3 text-xs"
              style={{ background: "var(--grove-surface-2)", border: "1px solid var(--grove-border)" }}
            >
              <div
                className="text-[10px] font-semibold tracking-[0.1em] uppercase mb-1.5"
                style={{ color: "var(--grove-accent)", fontFamily: "var(--font-geist-mono)" }}
              >
                Lore
              </div>
              <span className="animate-pulse" style={{ color: "var(--grove-text-3)" }}>
                Thinking...
              </span>
            </div>
          </div>
        )}
      </div>

      <LoreChatInput onSend={handleSend} disabled={sending} />
    </div>
  );
}
```

**`LoreShell.tsx`** — full page layout:

```typescript
"use client";
import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import LoreSessionList from "./LoreSessionList";
import LoreChat from "./LoreChat";

interface LoreShellProps {
  sessionId: string;
}

export default function LoreShell({ sessionId }: LoreShellProps) {
  const [showNotePreview, setShowNotePreview] = useState(false);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--grove-bg)" }}
    >
      {/* Left: Grove sidebar (notes list + nav toggle) */}
      <Sidebar />

      {/* Center-left: Lore session list (desktop only) */}
      <div
        className="hidden md:flex w-52 shrink-0 flex-col h-screen"
        style={{
          background: "var(--grove-bg)",
          borderRight: "1px solid var(--grove-border)",
        }}
      >
        <LoreSessionList currentSessionId={sessionId} />
      </div>

      {/* Center: Chat */}
      <main
        className="flex-1 flex flex-col h-screen min-w-0"
        style={{ background: "var(--grove-surface)" }}
      >
        <LoreChat sessionId={sessionId} />
      </main>
    </div>
  );
}
```

**Commit:**

```bash
git add src/components/lore/
git commit -m "feat: add Lore chat UI components (LoreChat, LoreShell, LoreSessionList)"
```

---

## Task 16: Update `Sidebar.tsx` — Nav Toggle + managedBy Lock Icon

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

**Step 1: Add nav toggle at the top of the sidebar**

Read the current file first, then add:

1. Import `usePathname` from `next/navigation`, `useRouter`
2. Import `Lock`, `Unlock`, `MessageSquare`, `FileText` from `lucide-react`
3. Import `useMutation` from `convex/react` and `api`
4. Add a nav toggle row below the GROVE header:

```typescript
const pathname = usePathname();
const router = useRouter();
const isLore = pathname.startsWith("/chat");

// Nav toggle bar (above note list):
<div
  className="mx-3 mb-3 flex rounded-md overflow-hidden"
  style={{ border: "1px solid var(--grove-border)" }}
>
  <button
    onClick={() => router.push("/chat")}
    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] transition-colors"
    style={{
      background: isLore ? "var(--grove-accent-dim)" : "transparent",
      color: isLore ? "var(--grove-accent)" : "var(--grove-text-3)",
      fontFamily: "var(--font-geist-mono)",
      borderRight: "1px solid var(--grove-border)",
    }}
  >
    <MessageSquare size={10} /> Lore
  </button>
  <button
    onClick={() => {
      const lastNote = localStorage.getItem("grove:lastNote");
      if (lastNote) router.push(`/note/${lastNote}`);
      else router.push("/");
    }}
    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] transition-colors"
    style={{
      background: !isLore ? "var(--grove-accent-dim)" : "transparent",
      color: !isLore ? "var(--grove-accent)" : "var(--grove-text-3)",
      fontFamily: "var(--font-geist-mono)",
    }}
  >
    <FileText size={10} /> Editor
  </button>
</div>
```

5. Add a lock icon per note in the note list for managedBy toggle. Add `updateManagement` mutation and show `Lock`/`Unlock` icon (10px, muted) in the note item that appears on hover:

```typescript
const updateManagement = useMutation(api.notes.updateManagement);

// In the note item, on hover, show a lock icon:
<button
  onClick={(e) => {
    e.stopPropagation();
    updateManagement({
      noteId: note._id,
      managedBy: (note.managedBy ?? "ai") === "ai" ? "user" : "ai",
    });
  }}
  title={`Managed by ${note.managedBy ?? "ai"} — click to toggle`}
  className="opacity-0 group-hover:opacity-60 ml-auto shrink-0 p-0.5"
  style={{ color: (note.managedBy ?? "ai") === "user" ? "var(--grove-accent)" : "var(--grove-text-3)" }}
>
  {(note.managedBy ?? "ai") === "user" ? <Lock size={9} /> : <Unlock size={9} />}
</button>
```

Make sure the note list query returns `managedBy` by updating `convex/notes.ts` `list` query to include it in the returned object.

**Step 2: Update `convex/notes.ts` list to return managedBy**

```typescript
return notes.map((note) => ({
  _id: note._id,
  title: note.title,
  managedBy: note.managedBy ?? "ai",
  updatedAt: note.updatedAt,
  createdAt: note.createdAt,
}));
```

**Step 3: Save lastNote to localStorage in the note page**

In `src/app/note/[noteId]/NoteWorkspace.tsx`, add:

```typescript
useEffect(() => {
  localStorage.setItem("grove:lastNote", noteId);
}, [noteId]);
```

**Verify + Commit:**

```bash
npx convex dev --once 2>&1 | tail -10
git add src/components/layout/Sidebar.tsx src/app/note/[noteId]/NoteWorkspace.tsx convex/notes.ts
git commit -m "feat: add nav toggle and managedBy lock icon to sidebar"
```

---

## Task 17: Add Lore Floating Drawer to Note Editor

**Files:**
- Modify: `src/app/note/[noteId]/NoteWorkspace.tsx`
- Modify: `src/components/layout/AppShell.tsx`

**Step 1: Read `?lore=1` from URL in NoteWorkspace**

```typescript
"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import DynamicEditor from "@/components/editor/DynamicEditor";

export default function NoteWorkspace({ noteId }: { noteId: string }) {
  const [showAISidebar, setShowAISidebar] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const showLore = searchParams.get("lore") === "1";

  useEffect(() => {
    localStorage.setItem("grove:lastNote", noteId);
  }, [noteId]);

  const toggleLore = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (showLore) params.delete("lore");
    else params.set("lore", "1");
    router.replace(`/note/${noteId}?${params.toString()}`);
  };

  return (
    <AppShell
      noteId={noteId}
      showAISidebar={showAISidebar}
      onToggleAISidebar={() => setShowAISidebar((s) => !s)}
      showLore={showLore}
      onToggleLore={toggleLore}
    >
      <DynamicEditor key={noteId} noteId={noteId} />
    </AppShell>
  );
}
```

**Step 2: Update AppShell to accept lore props and render drawer**

Add to `AppShell`'s interface and implementation:

```typescript
interface AppShellProps {
  children: React.ReactNode;
  noteId: string;
  showAISidebar: boolean;
  onToggleAISidebar: () => void;
  showLore?: boolean;
  onToggleLore?: () => void;
}
```

Add a second toggle button for Lore (next to the existing AI/Quill button):

```typescript
<button
  onClick={onToggleLore}
  className="fixed top-4 right-[calc(1rem+120px)] z-30 ..."
  style={{ /* same pattern as Quill toggle, but for Lore */ }}
>
  <Sparkles size={12} />
  Lore
</button>
```

Add Lore drawer (right side, 400px, on top of everything):

```typescript
{showLore && (
  <div
    className="fixed top-0 right-0 h-screen w-[400px] z-40 flex flex-col"
    style={{
      background: "var(--grove-bg)",
      borderLeft: "1px solid var(--grove-border)",
      boxShadow: "-8px 0 32px rgba(0,0,0,0.3)",
    }}
  >
    {/* Lore drawer needs a session — create one or use a stored one */}
    <LoreDrawer noteId={noteId} onClose={() => onToggleLore?.()} />
  </div>
)}
```

**Step 3: Create `src/components/lore/LoreDrawer.tsx`**

The drawer needs a session ID. Store one per browser session in sessionStorage:

```typescript
"use client";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect, useState } from "react";
import LoreChat from "./LoreChat";
import { X } from "lucide-react";

export default function LoreDrawer({
  noteId,
  onClose,
}: {
  noteId: string;
  onClose: () => void;
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const createSession = useMutation(api.loreConversations.create);

  useEffect(() => {
    const stored = sessionStorage.getItem("grove:loreDrawerSession");
    if (stored) {
      setSessionId(stored);
    } else {
      createSession().then((id) => {
        sessionStorage.setItem("grove:loreDrawerSession", id);
        setSessionId(id);
      });
    }
  }, [createSession]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid var(--grove-border)" }}
      >
        <span
          className="text-xs font-semibold tracking-[0.15em] uppercase"
          style={{ color: "var(--grove-text-2)", fontFamily: "var(--font-geist-mono)" }}
        >
          Lore
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded"
          style={{ color: "var(--grove-text-3)" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--grove-text)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--grove-text-3)"}
        >
          <X size={14} />
        </button>
      </div>

      {sessionId ? (
        <LoreChat sessionId={sessionId} />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <span
            className="text-xs animate-pulse"
            style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
          >
            Starting Lore...
          </span>
        </div>
      )}
    </div>
  );
}
```

**Verify + Commit:**

```bash
npx convex dev --once 2>&1 | tail -10
npm run build 2>&1 | tail -20
git add src/app/note/[noteId]/NoteWorkspace.tsx src/components/layout/AppShell.tsx src/components/lore/LoreDrawer.tsx
git commit -m "feat: add Lore floating drawer to note editor via ?lore=1"
```

---

## Task 18: Final Build Check + Push

**Step 1: Make sure Convex dev is happy**

```bash
cd /home/ishnoor/dev/grove && npx convex dev --once 2>&1 | grep -E "error|Error|✓"
```

**Step 2: Build**

```bash
npm run build 2>&1 | tail -30
```

Expected: `✓ Compiled successfully`. Fix any TypeScript errors before proceeding.

**Step 3: Push to GitHub**

```bash
git push
```

**Step 4: Check background AI chat fix PR was merged**

```bash
gh pr list
```

If the `fix/ai-chat` PR is open, review it and note any conflicts with the new lore branch work.

---

## Known Gotchas

1. **`NoteWorkspace` uses `useSearchParams`** — must be wrapped in a `<Suspense>` boundary in Next.js App Router. Wrap it in the note page:
   ```typescript
   // src/app/note/[noteId]/page.tsx
   import { Suspense } from "react";
   <Suspense fallback={<div>Loading...</div>}>
     <NoteWorkspace noteId={noteId} />
   </Suspense>
   ```

2. **Convex `internalMutation` cannot call `internalAction`** — `loreChatMessages.send` (a public mutation) schedules `lore.run` (an internalAction) via `ctx.scheduler.runAfter`. This is the correct pattern.

3. **`blocks.search` is an `internalQuery` with a full table scan** — acceptable for V1 with <1000 notes. Add full-text search or embeddings when note count grows.

4. **Lore's `update_note` tool uses `markdownToBlocks`** — this is a simple converter. Complex formatting (tables, code blocks) may not round-trip perfectly. Good enough for V1.

5. **`managedBy` field on existing notes** — existing notes in the DB don't have this field. The Convex validator uses `v.union(v.literal("ai"), v.literal("user"))` which is strict. Change to `v.optional(v.union(...))` in schema and treat `undefined` as `"ai"` in all logic, then migrate later.
