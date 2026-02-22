import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const rename = mutation({
  args: {
    sessionId: v.id("loreConversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      title: args.title.trim() || "New conversation",
      updatedAt: Date.now(),
    });
  },
});

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
