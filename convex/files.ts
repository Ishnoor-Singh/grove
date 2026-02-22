import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Returns a short-lived signed URL the frontend POSTs the file body to.
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Given the storageId returned in the POST response, returns the serving URL.
export const getFileUrl = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
