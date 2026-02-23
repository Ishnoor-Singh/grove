import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";

// ─── Public queries ───────────────────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("folders")
      .withIndex("by_createdAt")
      .order("asc")
      .collect();
  },
});

export const get = query({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.folderId);
  },
});

// ─── Public mutations ─────────────────────────────────────────────────────────

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("folders", {
      name: args.name.trim(),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const rename = mutation({
  args: { folderId: v.id("folders"), name: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.folderId, {
      name: args.name.trim(),
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args) => {
    // Unassign all notes in this folder
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_folderId", (q) => q.eq("folderId", args.folderId))
      .collect();
    for (const note of notes) {
      await ctx.db.patch(note._id, { folderId: undefined });
    }
    await ctx.db.delete(args.folderId);
  },
});

export const moveNote = mutation({
  args: {
    noteId: v.id("notes"),
    folderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.noteId, { folderId: args.folderId });
  },
});

// ─── Internal helpers (used by Lore + source ingestion) ──────────────────────

export const listInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("folders")
      .withIndex("by_createdAt")
      .order("asc")
      .collect();
  },
});

export const getInternal = internalQuery({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.folderId);
  },
});

/** Gets the Inbox folder by name, creating it if it doesn't exist. */
export const getOrCreateInbox = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("folders")
      .withIndex("by_name", (q) => q.eq("name", "Inbox"))
      .first();
    if (existing) return existing._id;
    const now = Date.now();
    return await ctx.db.insert("folders", {
      name: "Inbox",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createInternal = internalMutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("folders", {
      name: args.name.trim(),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const renameInternal = internalMutation({
  args: { folderId: v.id("folders"), name: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.folderId, {
      name: args.name.trim(),
      updatedAt: Date.now(),
    });
  },
});

export const removeInternal = internalMutation({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_folderId", (q) => q.eq("folderId", args.folderId))
      .collect();
    for (const note of notes) {
      await ctx.db.patch(note._id, { folderId: undefined });
    }
    await ctx.db.delete(args.folderId);
  },
});

export const moveNoteInternal = internalMutation({
  args: {
    noteId: v.id("notes"),
    folderId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.noteId, { folderId: args.folderId });
  },
});
