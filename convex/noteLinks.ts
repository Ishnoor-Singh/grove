import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Returns all links (accepted + pending) for use in the graph
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("noteLinks").collect();
  },
});

// Create a manual link between two notes (always accepted)
export const create = mutation({
  args: {
    sourceNoteId: v.id("notes"),
    targetNoteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    // Prevent duplicates
    const existing = await ctx.db
      .query("noteLinks")
      .withIndex("by_sourceNoteId", (q) => q.eq("sourceNoteId", args.sourceNoteId))
      .filter((q) => q.eq(q.field("targetNoteId"), args.targetNoteId))
      .first();
    if (existing) return existing._id;

    return await ctx.db.insert("noteLinks", {
      sourceNoteId: args.sourceNoteId,
      targetNoteId: args.targetNoteId,
      type: "manual",
      status: "accepted",
      createdAt: Date.now(),
    });
  },
});

// Accept a pending auto-detected link
export const accept = mutation({
  args: { linkId: v.id("noteLinks") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.linkId, { status: "accepted" });
  },
});

// Dismiss a pending link (delete it)
export const dismiss = mutation({
  args: { linkId: v.id("noteLinks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.linkId);
  },
});

// Remove a manual link
export const remove = mutation({
  args: { linkId: v.id("noteLinks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.linkId);
  },
});

// Internal: create an auto-detected pending link (called from ai.ts)
export const createAutoLink = internalMutation({
  args: {
    sourceNoteId: v.id("notes"),
    targetNoteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("noteLinks")
      .withIndex("by_sourceNoteId", (q) => q.eq("sourceNoteId", args.sourceNoteId))
      .filter((q) => q.eq(q.field("targetNoteId"), args.targetNoteId))
      .first();
    if (existing) return;

    await ctx.db.insert("noteLinks", {
      sourceNoteId: args.sourceNoteId,
      targetNoteId: args.targetNoteId,
      type: "auto",
      status: "pending",
      createdAt: Date.now(),
    });
  },
});
