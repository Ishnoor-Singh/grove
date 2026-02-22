import {
  internalMutation,
  internalQuery,
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

// Get all blocks (noteId + text only) for semantic search
export const listAll = internalQuery({
  args: {},
  handler: async (ctx) => {
    const blocks = await ctx.db.query("blocks").collect();
    return blocks.map((b) => ({ noteId: b.noteId, text: b.text }));
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
