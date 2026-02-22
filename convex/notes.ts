import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_updatedAt")
      .order("desc")
      .collect();
    return notes.map((note) => ({
      _id: note._id,
      title: note.title,
      updatedAt: note.updatedAt,
      createdAt: note.createdAt,
    }));
  },
});

export const get = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.noteId);
  },
});

export const getInternal = internalQuery({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.noteId);
  },
});

export const create = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const noteId = await ctx.db.insert("notes", {
      title: "Untitled",
      content: [
        {
          id: "initial",
          type: "paragraph",
          props: {
            textColor: "default",
            backgroundColor: "default",
            textAlignment: "left",
          },
          content: [],
          children: [],
        },
      ],
      managedBy: "ai" as const,
      createdAt: now,
      updatedAt: now,
    });
    return noteId;
  },
});

export const update = mutation({
  args: {
    noteId: v.id("notes"),
    content: v.any(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const note = await ctx.db.get(args.noteId);
    if (!note) {
      throw new Error("Note not found");
    }

    await ctx.db.patch(args.noteId, {
      title: args.title,
      content: args.content,
      updatedAt: now,
    });

    if (
      note.lastTaggedAt === undefined ||
      now - note.lastTaggedAt > 5000
    ) {
      await ctx.scheduler.runAfter(0, internal.ai.classifyBlocks, {
        noteId: args.noteId,
      });
      await ctx.db.patch(args.noteId, {
        lastTaggedAt: now,
      });
    }

    await ctx.scheduler.runAfter(0, internal.ai.syncBlocks, {
      noteId: args.noteId,
    });
  },
});

export const remove = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const { noteId } = args;

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_noteId", (q) => q.eq("noteId", noteId))
      .collect();
    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    const blockTags = await ctx.db
      .query("blockTags")
      .withIndex("by_noteId", (q) => q.eq("noteId", noteId))
      .collect();
    for (const tag of blockTags) {
      await ctx.db.delete(tag._id);
    }

    const chatMessages = await ctx.db
      .query("chatMessages")
      .withIndex("by_noteId", (q) => q.eq("noteId", noteId))
      .collect();
    for (const message of chatMessages) {
      await ctx.db.delete(message._id);
    }

    await ctx.db.delete(noteId);
  },
});

export const updateTitle = mutation({
  args: {
    noteId: v.id("notes"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.noteId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});
