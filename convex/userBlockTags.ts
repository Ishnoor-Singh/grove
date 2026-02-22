import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByNote = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userBlockTags")
      .withIndex("by_noteId", (q) => q.eq("noteId", args.noteId))
      .collect();
  },
});

export const listByBlock = query({
  args: { noteId: v.id("notes"), blockId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userBlockTags")
      .withIndex("by_noteId_blockId", (q) =>
        q.eq("noteId", args.noteId).eq("blockId", args.blockId)
      )
      .collect();
  },
});

export const addTag = mutation({
  args: {
    noteId: v.id("notes"),
    blockId: v.string(),
    tag: v.string(),
  },
  handler: async (ctx, args) => {
    // Check for duplicate
    const existing = await ctx.db
      .query("userBlockTags")
      .withIndex("by_noteId_blockId", (q) =>
        q.eq("noteId", args.noteId).eq("blockId", args.blockId)
      )
      .filter((q) => q.eq(q.field("tag"), args.tag))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("userBlockTags", {
      noteId: args.noteId,
      blockId: args.blockId,
      tag: args.tag.trim().toLowerCase(),
      createdAt: Date.now(),
    });
  },
});

export const removeTag = mutation({
  args: {
    tagId: v.id("userBlockTags"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.tagId);
  },
});
