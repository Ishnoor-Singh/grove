"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";

// Semantic search using Claude to understand query intent and rank notes by relevance.
// Goes beyond keyword matching — finds notes related by meaning, synonyms, and concepts.
export const semanticSearch = action({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    if (!args.query.trim()) return [];

    const notes = await ctx.runQuery(internal.notes.listInternal, {});
    if (notes.length === 0) return [];

    const allBlocks = await ctx.runQuery(internal.blocks.listAll, {});

    // Group block text by noteId
    const noteTexts = new Map<string, string[]>();
    for (const block of allBlocks) {
      const id = block.noteId as string;
      if (!noteTexts.has(id)) noteTexts.set(id, []);
      if (block.text.trim()) noteTexts.get(id)!.push(block.text);
    }

    // Build compact note summaries for Claude (cap content to keep prompt manageable)
    const summaries = notes
      .map((n) => {
        const texts = noteTexts.get(n._id as string) ?? [];
        const content = texts.join(" ").slice(0, 400);
        return JSON.stringify({ id: n._id, title: n.title, content });
      })
      .join("\n");

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system:
        "You are a semantic search engine for a personal notes app. " +
        "Given a search query, identify which notes are semantically relevant. " +
        "Consider synonyms, related concepts, and implied topics — not just exact keyword matches. " +
        "Return results only when there is genuine relevance.",
      messages: [
        {
          role: "user",
          content:
            `Search query: ${JSON.stringify(args.query)}\n\n` +
            `Available notes (JSON, one per line):\n${summaries}\n\n` +
            `Return ONLY a JSON array of note IDs ordered by relevance (most relevant first). ` +
            `Use the "id" field values exactly. Return [] if nothing is relevant.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "[]";
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return [];

    try {
      const rankedIds: string[] = JSON.parse(match[0]);
      const noteMap = new Map(
        notes.map((n) => [
          n._id as string,
          {
            _id: n._id,
            title: n.title,
            managedBy: (n.managedBy ?? "ai") as "ai" | "user",
            updatedAt: n.updatedAt,
            createdAt: n.createdAt,
          },
        ])
      );
      return rankedIds
        .map((id) => noteMap.get(id))
        .filter((n): n is NonNullable<typeof n> => n !== undefined);
    } catch {
      return [];
    }
  },
});
