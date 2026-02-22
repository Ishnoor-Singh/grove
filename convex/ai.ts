"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// BlockNote JSON helpers
// ---------------------------------------------------------------------------

function extractTextFromBlocks(
  blocks: any[]
): { blockId: string; text: string }[] {
  const results: { blockId: string; text: string }[] = [];
  for (const block of blocks) {
    if (block.content && Array.isArray(block.content)) {
      const text = block.content
        .filter((c: any) => c.type === "text")
        .map((c: any) => c.text)
        .join("");
      if (text.trim()) {
        results.push({ blockId: block.id, text: text.trim() });
      }
    }
    if (block.children && Array.isArray(block.children)) {
      results.push(...extractTextFromBlocks(block.children));
    }
  }
  return results;
}

function blocksToMarkdown(blocks: any[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    const text =
      block.content
        ?.filter((c: any) => c.type === "text")
        .map((c: any) => {
          let t: string = c.text;
          if (c.styles?.bold) t = `**${t}**`;
          if (c.styles?.italic) t = `*${t}*`;
          if (c.styles?.code) t = `\`${t}\``;
          return t;
        })
        .join("") || "";

    switch (block.type) {
      case "heading": {
        const level = block.props?.level || 1;
        lines.push(`${"#".repeat(level)} ${text}`);
        break;
      }
      case "bulletListItem":
        lines.push(`- ${text}`);
        break;
      case "numberedListItem":
        lines.push(`1. ${text}`);
        break;
      case "checkListItem": {
        const checked = block.props?.checked ? "x" : " ";
        lines.push(`- [${checked}] ${text}`);
        break;
      }
      case "codeBlock":
        lines.push(`\`\`\`\n${text}\n\`\`\``);
        break;
      case "quote":
        lines.push(`> ${text}`);
        break;
      default:
        if (text) lines.push(text);
        break;
    }

    if (block.children?.length) {
      lines.push(blocksToMarkdown(block.children));
    }
  }
  return lines.join("\n\n");
}

// ---------------------------------------------------------------------------
// LLM provider abstraction
// ---------------------------------------------------------------------------

interface LLMProvider {
  generateText(params: {
    systemPrompt: string;
    userPrompt: string;
    maxTokens: number;
  }): Promise<string>;
}

class ClaudeProvider implements LLMProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async generateText({
    systemPrompt,
    userPrompt,
    maxTokens,
  }: {
    systemPrompt: string;
    userPrompt: string;
    maxTokens: number;
  }): Promise<string> {
    const message = await this.client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    const block = message.content[0];
    return block.type === "text" ? block.text : "";
  }
}

const llm: LLMProvider = new ClaudeProvider();

// ---------------------------------------------------------------------------
// Action 1 – classifyBlocks
// ---------------------------------------------------------------------------

export const classifyBlocks = internalAction({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    try {
      const note = await ctx.runQuery(internal.notes.getInternal, {
        noteId: args.noteId,
      });

      if (!note || !note.content) return;

      const blocks = extractTextFromBlocks(note.content as any[]);
      if (blocks.length === 0) return;

      const userPrompt = `Classify each of the following text blocks. For each, assign ONE tag from: claim, question, action_item, source_needed, idea, reference, definition, counterpoint.
Only classify blocks where a tag clearly applies. Skip blocks that are just regular prose without a clear category.
Respond with JSON array: [{"blockId": "...", "tag": "...", "confidence": 0.0-1.0}]

Blocks:
${blocks.map((b) => `[${b.blockId}]: ${b.text}`).join("\n")}`;

      const raw = await llm.generateText({
        systemPrompt:
          "You are a text classifier. Respond ONLY with a JSON array, no other text.",
        userPrompt,
        maxTokens: 1024,
      });

      // Extract JSON array from response
      const match = raw.match(/\[[\s\S]*\]/);
      if (!match) return;

      const parsed: { blockId: string; tag: string; confidence: number }[] =
        JSON.parse(match[0]);

      if (!Array.isArray(parsed) || parsed.length === 0) return;

      await ctx.runMutation(internal.tags.upsertTags, {
        noteId: args.noteId,
        tags: parsed.map((t) => ({
          blockId: t.blockId,
          tag: t.tag,
          confidence: t.confidence,
        })),
      });
    } catch (error) {
      console.error("classifyBlocks failed:", error);
    }
  },
});

// ---------------------------------------------------------------------------
// Action 2 – generateChatResponse
// ---------------------------------------------------------------------------

export const generateChatResponse = internalAction({
  args: {
    noteId: v.id("notes"),
    userMessage: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const note = await ctx.runQuery(internal.notes.getInternal, {
        noteId: args.noteId,
      });

      const markdown = note?.content
        ? blocksToMarkdown(note.content as any[])
        : "(empty note)";

      const chatHistory = await ctx.runQuery(
        internal.chat.listByNoteInternal,
        { noteId: args.noteId }
      );

      const historyText = chatHistory
        .map((m: { role: string; content: string }) => `${m.role}: ${m.content}`)
        .join("\n");

      const isSourceNote = !!note?.sourceUrl;
      const systemPrompt = isSourceNote
        ? `You are a helpful AI assistant embedded in a note-taking app called Grove.
The current note was ingested from an external source (${note!.sourceUrl}).
The note contains the raw source content plus a Notes section.
Help the user understand, analyse, and discuss the source material.
Reference specific parts of the raw content when relevant. Be concise.`
        : `You are a helpful AI assistant embedded in a note-taking app called Grove.
You have access to the user's current note as context.
Reference specific parts of the note when relevant.
Be concise and helpful.
If you reference a specific section, mention it clearly.`;

      const userPrompt = `## Current Note:
${markdown}

## Conversation:
${historyText}

## Latest Message:
${args.userMessage}`;

      const response = await llm.generateText({
        systemPrompt,
        userPrompt,
        maxTokens: 2048,
      });

      await ctx.runMutation(internal.chat.saveAIResponse, {
        noteId: args.noteId,
        content: response,
      });

      // For source notes, update the Notes section with conversation insights
      if (isSourceNote) {
        await ctx.scheduler.runAfter(0, internal.ai.updateSourceNotes, {
          noteId: args.noteId,
        });
      }
    } catch (error) {
      console.error("generateChatResponse failed:", error);
    }
  },
});

// ---------------------------------------------------------------------------
// Action 3 – generateAIComment
// ---------------------------------------------------------------------------

export const generateAIComment = internalAction({
  args: {
    noteId: v.id("notes"),
    blockId: v.string(),
    selectedText: v.string(),
    commentType: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const note = await ctx.runQuery(internal.notes.getInternal, {
        noteId: args.noteId,
      });

      const markdown = note?.content
        ? blocksToMarkdown(note.content as any[])
        : "(empty note)";

      const promptsByType: Record<string, string> = {
        improve: "Suggest improvements for this text selection",
        fact_check: "Fact-check this claim and note any issues",
        link_notes:
          "Identify related concepts or topics that could be explored further",
        elaborate: "Suggest how to elaborate on this point",
      };

      const instruction =
        promptsByType[args.commentType] || promptsByType.improve;

      const userPrompt = `## Full Note Context:
${markdown}

## Selected Text:
"${args.selectedText}"

## Task:
${instruction}`;

      const response = await llm.generateText({
        systemPrompt:
          "You are a writing assistant. Provide concise, actionable feedback. Keep responses under 3 paragraphs.",
        userPrompt,
        maxTokens: 512,
      });

      await ctx.runMutation(internal.comments.createInternal, {
        noteId: args.noteId,
        blockId: args.blockId,
        selectedText: args.selectedText,
        author: "ai",
        body: response,
      });
    } catch (error) {
      console.error("generateAIComment failed:", error);
    }
  },
});

// ---------------------------------------------------------------------------
// Action 4 – syncBlocks (keeps blocks table in sync with note content)
// ---------------------------------------------------------------------------

export const syncBlocks = internalAction({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    try {
      const note = await ctx.runQuery(internal.notes.getInternal, {
        noteId: args.noteId,
      });
      if (!note?.content) return;

      const rawBlocks = note.content as any[];
      const synced = flattenBlocks(rawBlocks, 0);
      await ctx.runMutation(internal.blocks.syncFromNote, {
        noteId: args.noteId,
        blocks: synced,
      });
    } catch (e) {
      console.error("syncBlocks failed:", e);
    }
  },
});

// ---------------------------------------------------------------------------
// Action 5 – updateSourceNotes (rewrites "Notes" section after chat)
// ---------------------------------------------------------------------------

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

function markdownBulletsToBlocks(markdown: string): any[] {
  const lines = markdown.split("\n").filter((l) => l.trim());
  return lines.map((line, i) => {
    const id = `note-${Date.now()}-${i}`;
    if (line.startsWith("- ") || line.startsWith("* "))
      return makeBlock(id, "bulletListItem", line.slice(2).trim());
    return makeBlock(id, "paragraph", line.trim());
  });
}

function replaceNotesSection(blocks: any[], notesMarkdown: string): any[] {
  // Find the "Notes" heading block
  const notesIdx = blocks.findIndex(
    (b) =>
      b.type === "heading" &&
      b.content?.some((c: any) => c.type === "text" && c.text === "Notes")
  );
  if (notesIdx === -1) {
    // Append at the end
    const ts = Date.now();
    return [
      ...blocks,
      makeBlock(`notes-heading-${ts}`, "heading", "Notes", { level: 2 }),
      ...markdownBulletsToBlocks(notesMarkdown),
    ];
  }

  // Find the next heading after Notes (to preserve subsequent sections)
  const nextHeadingIdx = blocks.findIndex(
    (b, i) => i > notesIdx && b.type === "heading"
  );

  const before = blocks.slice(0, notesIdx + 1); // keep up to and including the Notes heading
  const after = nextHeadingIdx !== -1 ? blocks.slice(nextHeadingIdx) : [];
  const newNoteBlocks = markdownBulletsToBlocks(notesMarkdown);

  return [...before, ...newNoteBlocks, ...after];
}

export const updateSourceNotes = internalAction({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    try {
      const note = await ctx.runQuery(internal.notes.getInternal, {
        noteId: args.noteId,
      });
      if (!note?.sourceUrl || !note.content) return;

      const chatHistory = await ctx.runQuery(
        internal.chat.listByNoteInternal,
        { noteId: args.noteId }
      );
      if (chatHistory.length === 0) return;

      const convoText = chatHistory
        .map((m: { role: string; content: string }) =>
          `${m.role === "user" ? "User" : "AI"}: ${m.content}`
        )
        .join("\n\n");

      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const resp = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system:
          "You extract concise bullet-point notes from conversations about a source. Each bullet should capture a distinct insight, question, or takeaway from the discussion. Reply with ONLY bullet points (- ...), one per line, no preamble.",
        messages: [
          {
            role: "user",
            content: `Source: ${note.sourceUrl}\n\nConversation:\n${convoText}\n\nWrite bullet-point notes capturing the key insights discussed:`,
          },
        ],
      });

      const notesMarkdown =
        resp.content[0].type === "text" ? resp.content[0].text.trim() : "";
      if (!notesMarkdown) return;

      const newContent = replaceNotesSection(
        note.content as any[],
        notesMarkdown
      );

      await ctx.runMutation(internal.notes.updateContent, {
        noteId: args.noteId,
        content: newContent,
      });
    } catch (error) {
      console.error("updateSourceNotes failed:", error);
    }
  },
});

function flattenBlocks(
  blocks: any[],
  startOrder: number,
  parentId?: string
): Array<{
  blockId: string;
  type: string;
  content: any;
  props?: any;
  parentId?: string;
  order: number;
  text: string;
}> {
  const result: ReturnType<typeof flattenBlocks> = [];
  blocks.forEach((block, i) => {
    const text = (block.content ?? [])
      .filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("");
    result.push({
      blockId: block.id,
      type: block.type,
      content: block.content,
      props: block.props,
      parentId,
      order: startOrder + i,
      text,
    });
    if (block.children?.length) {
      result.push(
        ...flattenBlocks(block.children, startOrder + i + 0.1, block.id)
      );
    }
  });
  return result;
}
