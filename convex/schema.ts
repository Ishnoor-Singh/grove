import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  notes: defineTable({
    title: v.string(),
    content: v.any(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastTaggedAt: v.optional(v.number()),
  })
    .index("by_updatedAt", ["updatedAt"])
    .index("by_createdAt", ["createdAt"]),

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

  chatMessages: defineTable({
    noteId: v.id("notes"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    blockReferences: v.optional(v.array(v.string())),
    createdAt: v.number(),
  })
    .index("by_noteId", ["noteId"])
    .index("by_noteId_createdAt", ["noteId", "createdAt"]),
});
