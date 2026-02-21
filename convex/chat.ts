import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const listByNote = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_noteId_createdAt", (q) => q.eq("noteId", args.noteId))
      .order("asc")
      .collect();
  },
});

export const sendMessage = mutation({
  args: {
    noteId: v.id("notes"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("chatMessages", {
      noteId: args.noteId,
      role: "user",
      content: args.content,
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.ai.generateChatResponse, {
      noteId: args.noteId,
      userMessage: args.content,
    });
  },
});

export const listByNoteInternal = internalQuery({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chatMessages")
      .withIndex("by_noteId_createdAt", (q) => q.eq("noteId", args.noteId))
      .order("asc")
      .collect();
  },
});

export const saveAIResponse = internalMutation({
  args: {
    noteId: v.id("notes"),
    content: v.string(),
    blockReferences: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("chatMessages", {
      noteId: args.noteId,
      role: "assistant",
      content: args.content,
      blockReferences: args.blockReferences,
      createdAt: Date.now(),
    });
  },
});
