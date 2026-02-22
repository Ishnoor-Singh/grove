"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const SUPADATA_BASE = "https://api.supadata.ai/v1";
const MAX_CONTENT_CHARS = 25000;

// ─── URL helpers ──────────────────────────────────────────────────────────────

function isYouTubeUrl(url: string): boolean {
  return (
    url.includes("youtube.com/watch") ||
    url.includes("youtu.be/") ||
    url.includes("youtube.com/shorts/")
  );
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|shorts\/)([^&?/]+)/);
  return match?.[1] ?? null;
}

// ─── BlockNote JSON helpers ───────────────────────────────────────────────────

function makeBlock(id: string, type: string, text: string, props?: any): any {
  return {
    id,
    type,
    props: {
      textColor: "default",
      backgroundColor: "default",
      textAlignment: "left",
      ...props,
    },
    content: text ? [{ type: "text", text, styles: {} }] : [],
    children: [],
  };
}

function makeLinkBlock(id: string, label: string, url: string): any {
  return {
    id,
    type: "paragraph",
    props: {
      textColor: "default",
      backgroundColor: "default",
      textAlignment: "left",
    },
    content: [
      { type: "text", text: "Source: ", styles: {} },
      {
        type: "link",
        href: url,
        content: [{ type: "text", text: label, styles: {} }],
      },
    ],
    children: [],
  };
}

function markdownToBlocks(markdown: string): any[] {
  const lines = markdown.split("\n").filter((l) => l.trim());
  return lines.map((line, i) => {
    const id = `src-${Date.now()}-${i}`;
    if (line.startsWith("### "))
      return makeBlock(id, "heading", line.slice(4), { level: 3 });
    if (line.startsWith("## "))
      return makeBlock(id, "heading", line.slice(3), { level: 2 });
    if (line.startsWith("# "))
      return makeBlock(id, "heading", line.slice(2), { level: 1 });
    if (line.startsWith("- ") || line.startsWith("* "))
      return makeBlock(id, "bulletListItem", line.slice(2));
    if (line.match(/^\d+\. /))
      return makeBlock(id, "numberedListItem", line.replace(/^\d+\. /, ""));
    if (line.startsWith("> "))
      return makeBlock(id, "quote", line.slice(2));
    return makeBlock(id, "paragraph", line);
  });
}

function buildSourceNoteContent(url: string, rawContent: string): any[] {
  const ts = Date.now();
  const truncated =
    rawContent.length > MAX_CONTENT_CHARS
      ? rawContent.slice(0, MAX_CONTENT_CHARS) + "\n\n[content truncated]"
      : rawContent;

  const contentBlocks = markdownToBlocks(truncated);

  return [
    // Source link
    makeLinkBlock(`src-link-${ts}`, url, url),
    makeBlock(`src-gap-${ts}`, "paragraph", ""),

    // Raw content section
    makeBlock(`src-raw-heading-${ts}`, "heading", "Raw Content", { level: 2 }),
    ...contentBlocks,

    // Notes section (populated by AI after conversations)
    makeBlock(`src-notes-heading-${ts}`, "heading", "Notes", { level: 2 }),
    makeBlock(`src-notes-placeholder-${ts}`, "paragraph", ""),
  ];
}

// ─── Public action: ingest ────────────────────────────────────────────────────

export const ingest = action({
  args: { url: v.string() },
  handler: async (ctx, args): Promise<string> => {
    const apiKey = process.env.SUPADATA_KEY;
    if (!apiKey) throw new Error("SUPADATA_KEY is not configured");

    const { url } = args;
    let title = url;
    let rawContent = "";

    if (isYouTubeUrl(url)) {
      // ── YouTube: fetch transcript ──────────────────────────────────────────
      const videoId = extractYouTubeId(url);

      // Fetch transcript (plain text)
      const transcriptResp = await fetch(
        `${SUPADATA_BASE}/youtube/transcript?url=${encodeURIComponent(url)}&text=true`,
        { headers: { "x-api-key": apiKey } }
      );
      if (!transcriptResp.ok) {
        const err = await transcriptResp.text();
        throw new Error(`Supadata transcript error (${transcriptResp.status}): ${err}`);
      }
      const transcriptData = await transcriptResp.json();
      rawContent =
        typeof transcriptData.content === "string"
          ? transcriptData.content
          : Array.isArray(transcriptData.content)
          ? transcriptData.content.map((c: any) => c.text ?? "").join(" ")
          : "";

      // Fetch video metadata for title
      if (videoId) {
        try {
          const metaResp = await fetch(
            `${SUPADATA_BASE}/youtube/video?id=${videoId}`,
            { headers: { "x-api-key": apiKey } }
          );
          if (metaResp.ok) {
            const meta = await metaResp.json();
            title = meta.title ?? title;
          }
        } catch {
          // Non-fatal — fall back to URL as title
        }
      }
    } else {
      // ── Web page: scrape content ───────────────────────────────────────────
      const scrapeResp = await fetch(
        `${SUPADATA_BASE}/web/scrape?url=${encodeURIComponent(url)}`,
        { headers: { "x-api-key": apiKey } }
      );
      if (!scrapeResp.ok) {
        const err = await scrapeResp.text();
        throw new Error(`Supadata scrape error (${scrapeResp.status}): ${err}`);
      }
      const scrapeData = await scrapeResp.json();
      rawContent = scrapeData.content ?? "";
      title = scrapeData.name ?? url;
    }

    if (!rawContent) {
      throw new Error("No content returned from source — the URL may not be supported");
    }

    // Create the note
    const noteId = await ctx.runMutation(internal.notes.createInternal, {
      title,
      sourceUrl: url,
    });

    const content = buildSourceNoteContent(url, rawContent);

    await ctx.runMutation(internal.notes.updateContent, {
      noteId,
      content,
      sourceUrl: url,
    });

    return noteId as string;
  },
});
