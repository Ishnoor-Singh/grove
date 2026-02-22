# File Upload Design

**Date:** 2026-02-22
**Status:** Approved

## Problem

The BlockNote `/` slash menu offers an "Embed" block but it only accepts URLs — it does not support uploading files from the local desktop. Users want to embed images and attach PDFs directly from their filesystem.

## Solution

Use BlockNote's built-in image block for images and a custom `pdfAttachment` block for PDFs. Both upload files to Convex's built-in file storage.

## Approach

**Approach 1 (chosen):** BlockNote native image block + custom PDF attachment block, both wired to Convex file storage.

Rejected alternatives:
- Single unified custom block for both types — loses BlockNote's polished image UX (resize, captions, alignment)
- External object storage (S3/R2) — unjustified complexity for a single-user app

## Architecture

### Storage Backend

Convex's built-in file storage. Two new Convex mutations:

- `convex/files.ts: generateUploadUrl` — calls `ctx.storage.generateUploadUrl()`, returns a signed POST URL
- `convex/files.ts: getFileUrl` — calls `ctx.storage.getUrl(storageId)`, returns the serving URL

Files are stored in Convex storage. The `storageId` string is embedded in the BlockNote block's `props` alongside the serving URL, so the note renders correctly on load without an extra lookup per render.

### Image Block

BlockNote's native image block, activated by passing `uploadFile` to `useCreateBlockNote`:

```
User types /Image
  → BlockNote opens file picker
  → User selects file
  → uploadFile(file) called
  → frontend calls generateUploadUrl mutation
  → fetch(uploadUrl, { method: "POST", body: file })
  → frontend calls getFileUrl(storageId)
  → returns serving URL to BlockNote
  → image renders inline with resize/caption support
```

### PDF Attachment Block

Custom BlockNote block type `pdfAttachment`.

**Props:**
- `url: string` — Convex serving URL
- `fileName: string` — original filename
- `fileSize: number` — bytes

**Slash menu entry:** "PDF" — opens `<input type="file" accept=".pdf">` on mount, triggers upload flow identical to images.

**Rendered UI:**
```
┌─────────────────────────────────────────┐
│  📄  filename.pdf          1.2 MB       │
│       [ Open ]  [ Download ]            │
└─────────────────────────────────────────┘
```
- "Open" — opens serving URL in new tab
- "Download" — `<a download>` link
- Styled with Grove design tokens (`--grove-surface-2`, `--grove-border`, `--grove-text-muted`)

**Upload flow:**
```
User types /PDF
  → pdfAttachment block inserted (empty state)
  → file input opens automatically
  → User selects .pdf file
  → generateUploadUrl → fetch POST → getFileUrl
  → block props updated with url, fileName, fileSize
  → card renders
```

### Persistence

No new Convex table. Both block types store their data in `props` within the note's `content` JSON field (already `v.any()`). The serving URL is stored directly so blocks render without extra queries.

## Files to Create / Modify

| File | Change |
|------|--------|
| `convex/files.ts` | New — `generateUploadUrl` and `getFileUrl` mutations |
| `src/components/editor/PdfAttachmentBlock.tsx` | New — custom BlockNote block definition + React component |
| `src/components/editor/Editor.tsx` | Modify — add `uploadFile` to `useCreateBlockNote`, register `pdfAttachment` schema |

## Out of Scope

- File deletion from Convex storage when a block is removed
- File size limits / validation beyond browser defaults
- Other file types (video, audio, etc.)
