import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const listByNote = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("suggestedEdits")
      .withIndex("by_noteId", (q) => q.eq("noteId", args.noteId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
  },
});

export const createSuggestion = internalMutation({
  args: {
    noteId: v.id("notes"),
    sessionId: v.optional(v.id("loreConversations")),
    editType: v.union(
      v.literal("create_note"),
      v.literal("add_block"),
      v.literal("update_block"),
      v.literal("delete_block"),
      v.literal("update_title")
    ),
    blockId: v.optional(v.string()),
    before: v.optional(v.any()),
    after: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("suggestedEdits", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const accept = mutation({
  args: { editId: v.id("suggestedEdits") },
  handler: async (ctx, args) => {
    const edit = await ctx.db.get(args.editId);
    if (!edit) throw new Error("Edit not found");

    // Apply the edit
    if (edit.editType === "update_title" && edit.after?.title) {
      await ctx.db.patch(edit.noteId, { title: edit.after.title, updatedAt: Date.now() });
    } else if (
      (edit.editType === "update_block" ||
        edit.editType === "add_block" ||
        edit.editType === "delete_block") &&
      edit.after?.content !== undefined
    ) {
      await ctx.db.patch(edit.noteId, {
        content: edit.after.content,
        updatedAt: Date.now(),
      });
    }

    await ctx.db.patch(args.editId, { status: "accepted" });
  },
});

export const reject = mutation({
  args: { editId: v.id("suggestedEdits") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.editId, { status: "rejected" });
  },
});
