import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const listByNote = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("comments")
      .withIndex("by_noteId", (q) => q.eq("noteId", args.noteId))
      .collect();
  },
});

export const listByBlock = query({
  args: { noteId: v.id("notes"), blockId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("comments")
      .withIndex("by_noteId_blockId", (q) =>
        q.eq("noteId", args.noteId).eq("blockId", args.blockId)
      )
      .collect();
  },
});

export const create = mutation({
  args: {
    noteId: v.id("notes"),
    blockId: v.string(),
    body: v.string(),
    author: v.union(v.literal("user"), v.literal("ai")),
    selectedText: v.optional(v.string()),
    selectionStart: v.optional(v.number()),
    selectionEnd: v.optional(v.number()),
    parentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const commentId = await ctx.db.insert("comments", {
      noteId: args.noteId,
      blockId: args.blockId,
      body: args.body,
      author: args.author,
      selectedText: args.selectedText,
      selectionStart: args.selectionStart,
      selectionEnd: args.selectionEnd,
      parentId: args.parentId,
      resolved: false,
      createdAt: Date.now(),
    });
    return commentId;
  },
});

export const createInternal = internalMutation({
  args: {
    noteId: v.id("notes"),
    blockId: v.string(),
    body: v.string(),
    author: v.union(v.literal("user"), v.literal("ai")),
    selectedText: v.optional(v.string()),
    selectionStart: v.optional(v.number()),
    selectionEnd: v.optional(v.number()),
    parentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const commentId = await ctx.db.insert("comments", {
      noteId: args.noteId,
      blockId: args.blockId,
      body: args.body,
      author: args.author,
      selectedText: args.selectedText,
      selectionStart: args.selectionStart,
      selectionEnd: args.selectionEnd,
      parentId: args.parentId,
      resolved: false,
      createdAt: Date.now(),
    });
    return commentId;
  },
});

export const resolve = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.commentId, { resolved: true });
  },
});

export const remove = mutation({
  args: { commentId: v.id("comments") },
  handler: async (ctx, args) => {
    const replies = await ctx.db
      .query("comments")
      .withIndex("by_parentId", (q) => q.eq("parentId", args.commentId))
      .collect();
    for (const reply of replies) {
      await ctx.db.delete(reply._id);
    }

    await ctx.db.delete(args.commentId);
  },
});
