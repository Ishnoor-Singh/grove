import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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

export const create = mutation({
  args: {
    name: v.string(),
    parentId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("folders", {
      name: args.name,
      parentId: args.parentId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const rename = mutation({
  args: {
    folderId: v.id("folders"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.folderId, {
      name: args.name,
      updatedAt: Date.now(),
    });
  },
});

export const move = mutation({
  args: {
    folderId: v.id("folders"),
    parentId: v.optional(v.id("folders")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.folderId, {
      parentId: args.parentId,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { folderId: v.id("folders") },
  handler: async (ctx, args) => {
    const { folderId } = args;

    // Move all notes in this folder to root (unfiled)
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_folderId", (q) => q.eq("folderId", folderId))
      .collect();
    for (const note of notes) {
      await ctx.db.patch(note._id, { folderId: undefined });
    }

    // Move child folders to parent of this folder
    const folder = await ctx.db.get(folderId);
    const childFolders = await ctx.db
      .query("folders")
      .withIndex("by_parentId", (q) => q.eq("parentId", folderId))
      .collect();
    for (const child of childFolders) {
      await ctx.db.patch(child._id, {
        parentId: folder?.parentId,
        updatedAt: Date.now(),
      });
    }

    await ctx.db.delete(folderId);
  },
});
