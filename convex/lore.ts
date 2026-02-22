"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";

const LORE_SYSTEM_PROMPT = `You are Lore, a knowledge agent inside Grove — a personal note-taking platform.
You have full access to the user's notes and can create, read, search, and edit them.
You can also search the web to bring in new information.

Personality: You are a capable chief-of-staff. Concise, thoughtful, proactive.
When editing notes, always describe what you did and why.
When referencing a note, mention its title.
When you create or edit a note, briefly summarize the change in your response.`;

// Custom tools that YOU execute in runTool
const CUSTOM_TOOLS: Anthropic.Tool[] = [
  {
    name: "list_notes",
    description: "List all notes with their IDs, titles, and last updated time.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "read_note",
    description: "Read the full markdown content of a specific note.",
    input_schema: {
      type: "object" as const,
      properties: {
        noteId: { type: "string", description: "The note's Convex ID" },
      },
      required: ["noteId"],
    },
  },
  {
    name: "search_notes",
    description: "Search for blocks matching a text query across all notes.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Text to search for" },
      },
      required: ["query"],
    },
  },
  {
    name: "create_note",
    description: "Create a new note with a title and optional initial content.",
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string" },
        content: {
          type: "string",
          description: "Initial markdown content (optional)",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "update_note",
    description:
      "Replace the full content of a note. Use this to add, edit, or reorganize content. Provide the complete new markdown — it will be converted to blocks.",
    input_schema: {
      type: "object" as const,
      properties: {
        noteId: { type: "string" },
        markdown: {
          type: "string",
          description: "The complete new note content in markdown",
        },
        title: {
          type: "string",
          description: "New title (optional — omit to keep existing)",
        },
      },
      required: ["noteId", "markdown"],
    },
  },
  {
    name: "update_title",
    description: "Rename a note.",
    input_schema: {
      type: "object" as const,
      properties: {
        noteId: { type: "string" },
        title: { type: "string" },
      },
      required: ["noteId", "title"],
    },
  },
];

// Anthropic's built-in server-side web search — no external API key needed.
// The API executes searches automatically; we extract results from server_tool_use blocks.
const WEB_SEARCH_TOOL = {
  type: "web_search_20260209" as const,
  name: "web_search",
  max_uses: 5,
};

// Combined tools passed to the API
const ALL_TOOLS = [...CUSTOM_TOOLS, WEB_SEARCH_TOOL] as any[];

// ─── Markdown → BlockNote JSON conversion ────────────────────────────────────

function markdownToBlocks(markdown: string): any[] {
  const lines = markdown.split("\n").filter((l) => l.trim());
  return lines.map((line, i) => {
    const id = `lore-${Date.now()}-${i}`;
    if (line.startsWith("### "))
      return makeBlock(id, "heading", line.slice(4), { level: 3 });
    if (line.startsWith("## "))
      return makeBlock(id, "heading", line.slice(3), { level: 2 });
    if (line.startsWith("# "))
      return makeBlock(id, "heading", line.slice(2), { level: 1 });
    if (line.startsWith("- "))
      return makeBlock(id, "bulletListItem", line.slice(2));
    if (line.match(/^\d+\. /))
      return makeBlock(id, "numberedListItem", line.replace(/^\d+\. /, ""));
    if (line.startsWith("> "))
      return makeBlock(id, "quote", line.slice(2));
    return makeBlock(id, "paragraph", line);
  });
}

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
    content: text
      ? [{ type: "text", text, styles: {} }]
      : [],
    children: [],
  };
}

function blocksToMarkdown(blocks: any[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    const text =
      block.content
        ?.filter((c: any) => c.type === "text")
        .map((c: any) => c.text)
        .join("") || "";
    switch (block.type) {
      case "heading": {
        const level = block.props?.level || 1;
        lines.push(`${"#".repeat(level)} ${text}`);
        break;
      }
      case "bulletListItem": lines.push(`- ${text}`); break;
      case "numberedListItem": lines.push(`1. ${text}`); break;
      case "quote": lines.push(`> ${text}`); break;
      default: if (text) lines.push(text); break;
    }
    if (block.children?.length) lines.push(blocksToMarkdown(block.children));
  }
  return lines.join("\n\n");
}

// ─── Main Lore action ─────────────────────────────────────────────────────────

export const run = internalAction({
  args: {
    sessionId: v.id("loreConversations"),
    userMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Build history from DB
    const history = await ctx.runQuery(
      internal.loreChatMessages.listBySessionInternal,
      { sessionId: args.sessionId }
    );

    const messages: Anthropic.MessageParam[] = [
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: args.userMessage },
    ];

    // Save user message
    await ctx.runMutation(internal.loreChatMessages.saveUserMessage, {
      sessionId: args.sessionId,
      content: args.userMessage,
    });

    const recordedToolCalls: Array<{
      toolName: string;
      input: any;
      output: any;
      durationMs: number;
    }> = [];
    let thinkingContent: string | undefined;
    let finalResponse = "";

    // Agentic loop
    while (true) {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: LORE_SYSTEM_PROMPT,
        tools: ALL_TOOLS,
        messages,
      });

      // Capture thinking
      const thinkingBlock = response.content.find((b) => b.type === "thinking");
      if (thinkingBlock && "thinking" in thinkingBlock) {
        thinkingContent = (thinkingBlock as any).thinking as string;
      }

      // pause_turn: API paused a long-running turn (e.g. during web search).
      // Pass the response back as-is to let Claude continue.
      if (response.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: response.content as any });
        continue;
      }

      if (response.stop_reason === "end_turn") {
        // Collect all text blocks for final response
        finalResponse = response.content
          .filter((b) => b.type === "text" && "text" in b)
          .map((b) => (b as any).text)
          .join("");

        // Extract server-side web search calls for storage/display in WebSearchCard
        const serverToolUseBlocks = response.content.filter(
          (b) => b.type === "server_tool_use"
        );
        for (const block of serverToolUseBlocks) {
          if ((block as any).name === "web_search") {
            const resultBlock = response.content.find(
              (b) =>
                b.type === "web_search_tool_result" &&
                (b as any).tool_use_id === (block as any).id
            );
            const results = ((resultBlock as any)?.content ?? []).map((r: any) => ({
              title: r.title,
              url: r.url,
              snippet: r.page_age ? `Updated: ${r.page_age}` : undefined,
            }));
            recordedToolCalls.push({
              toolName: "web_search",
              input: (block as any).input,
              output: { query: (block as any).input?.query, results },
              durationMs: 0,
            });
          }
        }
        break;
      }

      if (response.stop_reason === "tool_use") {
        // Only custom tools reach here — web_search is server-side and never produces "tool_use".
        const toolUseBlocks = response.content.filter(
          (b) => b.type === "tool_use"
        );
        messages.push({ role: "assistant", content: response.content as any });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of toolUseBlocks) {
          if (block.type !== "tool_use") continue;

          const start = Date.now();
          let result: any;

          try {
            result = await runTool(ctx, block.name, block.input as any);
          } catch (e: any) {
            result = { error: e.message };
          }

          recordedToolCalls.push({
            toolName: block.name,
            input: block.input,
            output: result,
            durationMs: Date.now() - start,
          });

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }

        messages.push({ role: "user", content: toolResults });
      } else {
        // Unexpected stop reason — break to avoid infinite loop
        break;
      }
    }

    // Auto-title session after first exchange
    if (history.length === 0) {
      try {
        const titlePrompt = `Generate a short 4-6 word title for a conversation that starts with: "${args.userMessage.slice(0, 100)}". Reply with ONLY the title, no quotes.`;
        const titleResp = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 20,
          messages: [{ role: "user", content: titlePrompt }],
        });
        const title =
          titleResp.content[0].type === "text"
            ? titleResp.content[0].text.trim()
            : "Conversation";
        await ctx.runMutation(internal.loreConversations.updateTitle, {
          sessionId: args.sessionId,
          title,
        });
      } catch {
        // Non-fatal — title stays as "New conversation"
      }
    }

    // Save assistant message
    await ctx.runMutation(internal.loreChatMessages.saveAssistantMessage, {
      sessionId: args.sessionId,
      content: finalResponse,
      thinkingContent,
      toolCalls: recordedToolCalls,
    });
  },
});

// ─── Tool execution (custom tools only) ───────────────────────────────────────

async function runTool(ctx: any, toolName: string, input: any): Promise<any> {
  switch (toolName) {
    case "list_notes": {
      const notes = await ctx.runQuery(internal.notes.listInternal, {});
      return notes.map((n: any) => ({
        id: n._id,
        title: n.title,
        managedBy: n.managedBy ?? "ai",
        updatedAt: n.updatedAt,
      }));
    }

    case "read_note": {
      const note = await ctx.runQuery(internal.notes.getInternal, {
        noteId: input.noteId,
      });
      if (!note) return { error: "Note not found" };
      return {
        id: note._id,
        title: note.title,
        managedBy: note.managedBy ?? "ai",
        content: blocksToMarkdown(note.content ?? []),
      };
    }

    case "search_notes": {
      const results = await ctx.runQuery(internal.blocks.search, {
        query: input.query,
      });
      return results;
    }

    case "create_note": {
      const content = input.content
        ? markdownToBlocks(input.content)
        : [makeBlock(`p-${Date.now()}`, "paragraph", "")];
      const noteId = await ctx.runMutation(internal.notes.createInternal, {
        title: input.title,
      });
      await ctx.runMutation(internal.notes.updateContent, {
        noteId,
        content,
      });
      return { success: true, noteId };
    }

    case "update_note": {
      const note = await ctx.runQuery(internal.notes.getInternal, {
        noteId: input.noteId,
      });
      if (!note) return { error: "Note not found" };

      const newContent = markdownToBlocks(input.markdown);
      const managedBy = note.managedBy ?? "ai";

      if (managedBy === "ai") {
        await ctx.runMutation(internal.notes.updateContent, {
          noteId: input.noteId,
          content: newContent,
          title: input.title,
        });
        return { success: true, blocksUpdated: newContent.length };
      } else {
        // Human-managed: create suggestion
        const editId = await ctx.runMutation(
          internal.suggestedEdits.createSuggestion,
          {
            noteId: input.noteId,
            editType: "update_block",
            before: { content: note.content, title: note.title },
            after: { content: newContent, title: input.title ?? note.title },
          }
        );
        return {
          pendingApproval: true,
          editId,
          message: `Suggested edit created for "${note.title}" — awaiting your approval.`,
        };
      }
    }

    case "update_title": {
      const note = await ctx.runQuery(internal.notes.getInternal, {
        noteId: input.noteId,
      });
      if (!note) return { error: "Note not found" };

      const managedBy = note.managedBy ?? "ai";
      if (managedBy === "ai") {
        await ctx.runMutation(internal.notes.updateContent, {
          noteId: input.noteId,
          content: note.content,
          title: input.title,
        });
        return { success: true };
      } else {
        const editId = await ctx.runMutation(
          internal.suggestedEdits.createSuggestion,
          {
            noteId: input.noteId,
            editType: "update_title",
            before: { title: note.title },
            after: { title: input.title },
          }
        );
        return { pendingApproval: true, editId };
      }
    }

    // Note: web_search is NOT handled here — it's Anthropic's server-side tool.
    // The API executes web searches automatically; we extract results from the response.

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}
