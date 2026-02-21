import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const listByNote = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("blockTags")
      .withIndex("by_noteId", (q) => q.eq("noteId", args.noteId))
      .collect();
  },
});

export const listByBlock = query({
  args: { noteId: v.id("notes"), blockId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("blockTags")
      .withIndex("by_noteId_blockId", (q) =>
        q.eq("noteId", args.noteId).eq("blockId", args.blockId)
      )
      .collect();
  },
});

export const upsertTags = internalMutation({
  args: {
    noteId: v.id("notes"),
    tags: v.array(
      v.object({
        blockId: v.string(),
        tag: v.string(),
        confidence: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("blockTags")
      .withIndex("by_noteId", (q) => q.eq("noteId", args.noteId))
      .collect();
    for (const tag of existing) {
      await ctx.db.delete(tag._id);
    }

    for (const tag of args.tags) {
      await ctx.db.insert("blockTags", {
        noteId: args.noteId,
        blockId: tag.blockId,
        tag: tag.tag as any,
        confidence: tag.confidence,
        createdAt: Date.now(),
      });
    }
  },
});

export const clearTagsForNote = internalMutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const tags = await ctx.db
      .query("blockTags")
      .withIndex("by_noteId", (q) => q.eq("noteId", args.noteId))
      .collect();
    for (const tag of tags) {
      await ctx.db.delete(tag._id);
    }
  },
});
