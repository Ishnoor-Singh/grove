import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
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
