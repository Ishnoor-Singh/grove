import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ── Notes ─────────────────────────────────────────────────────
  notes: defineTable({
    title: v.string(),
    content: v.any(),                    // BlockNote JSON array (editor source of truth)
    managedBy: v.optional(v.union(v.literal("ai"), v.literal("user"))), // optional for backwards compat, treat undefined as "ai"
    sourceUrl: v.optional(v.string()),   // set when note was created by ingesting a source URL
    createdAt: v.number(),
    updatedAt: v.number(),
    lastTaggedAt: v.optional(v.number()),
  })
    .index("by_updatedAt", ["updatedAt"])
    .index("by_createdAt", ["createdAt"])
    .searchIndex("search_title", { searchField: "title" }),

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
    .index("by_blockId", ["blockId"])
    .searchIndex("search_text", { searchField: "text" }),

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
