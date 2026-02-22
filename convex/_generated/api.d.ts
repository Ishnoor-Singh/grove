/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai from "../ai.js";
import type * as blocks from "../blocks.js";
import type * as chat from "../chat.js";
import type * as comments from "../comments.js";
import type * as folders from "../folders.js";
import type * as lore from "../lore.js";
import type * as loreChatMessages from "../loreChatMessages.js";
import type * as loreConversations from "../loreConversations.js";
import type * as notes from "../notes.js";
import type * as sources from "../sources.js";
import type * as suggestedEdits from "../suggestedEdits.js";
import type * as tags from "../tags.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  blocks: typeof blocks;
  chat: typeof chat;
  comments: typeof comments;
  folders: typeof folders;
  lore: typeof lore;
  loreChatMessages: typeof loreChatMessages;
  loreConversations: typeof loreConversations;
  notes: typeof notes;
  sources: typeof sources;
  suggestedEdits: typeof suggestedEdits;
  tags: typeof tags;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
