import {
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { v } from "convex/values";

// Called after a note's content changes — syncs blocks table
export const syncFromNote = internalMutation({
  args: {
    noteId: v.id("notes"),
    blocks: v.array(v.object({
      blockId: v.string(),
      type: v.string(),
      content: v.any(),
      props: v.optional(v.any()),
      parentId: v.optional(v.string()),
      order: v.number(),
      text: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    // Delete existing blocks for this note
    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_noteId", (q) => q.eq("noteId", args.noteId))
      .collect();
    for (const b of existing) await ctx.db.delete(b._id);

    // Insert new blocks
    const now = Date.now();
    for (const b of args.blocks) {
      await ctx.db.insert("blocks", {
        noteId: args.noteId,
        blockId: b.blockId,
        type: b.type,
        content: b.content,
        props: b.props,
        parentId: b.parentId,
        order: b.order,
        text: b.text,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Search blocks and note titles using full-text search (BM25 relevance ranking).
// Returns up to 20 results enriched with note title and noteId.
export const search = internalQuery({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    // Full-text search on block content
    const blockHits = await ctx.db
      .query("blocks")
      .withSearchIndex("search_text", (q) => q.search("text", args.query))
      .take(15);

    // Full-text search on note titles — surface notes whose title matches even
    // if the content blocks don't
    const titleHits = await ctx.db
      .query("notes")
      .withSearchIndex("search_title", (q) => q.search("title", args.query))
      .take(5);

    // Resolve noteIds → titles for block hits (deduplicate lookups)
    const noteCache = new Map<string, string>();
    const getTitle = async (noteId: string): Promise<string> => {
      if (noteCache.has(noteId)) return noteCache.get(noteId)!;
      const note = await ctx.db.get(noteId as any);
      const title = (note as any)?.title ?? "Untitled";
      noteCache.set(noteId, title);
      return title;
    };

    const blockResults = await Promise.all(
      blockHits.map(async (b) => ({
        noteId: b.noteId,
        noteTitle: await getTitle(b.noteId),
        blockId: b.blockId,
        text: b.text,
        type: b.type,
        matchedOn: "content" as const,
      }))
    );

    // Deduplicate noteIds already covered by block hits
    const coveredNoteIds = new Set(blockResults.map((r) => r.noteId.toString()));

    const titleResults = titleHits
      .filter((n) => !coveredNoteIds.has(n._id.toString()))
      .map((n) => ({
        noteId: n._id,
        noteTitle: n.title,
        blockId: null,
        text: n.title,
        type: "title",
        matchedOn: "title" as const,
      }));

    return [...blockResults, ...titleResults];
  },
});

// Get all blocks for a note ordered by position
export const listByNote = internalQuery({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("blocks")
      .withIndex("by_noteId_order", (q) => q.eq("noteId", args.noteId))
      .order("asc")
      .collect();
  },
});
