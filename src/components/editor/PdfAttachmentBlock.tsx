// src/components/editor/PdfAttachmentBlock.tsx
"use client";

import { createReactBlockSpec } from "@blocknote/react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRef, useEffect, useState } from "react";

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function PdfAttachmentRenderer({
  block,
  editor,
}: {
  block: any;
  editor: any;
}) {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const getFileUrl = useMutation(api.files.getFileUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const hasFile = !!block.props.url;

  // Auto-open file picker when block is first inserted (no file yet)
  useEffect(() => {
    if (!hasFile && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1. Get signed upload URL from Convex
      const uploadUrl = await generateUploadUrl({});

      // 2. POST the file directly to Convex storage
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/pdf" },
        body: file,
      });
      if (!response.ok) throw new Error("Upload failed");
      const { storageId } = await response.json();

      // 3. Get the serving URL
      const url = await getFileUrl({ storageId });

      // 4. Update block props with file metadata
      editor.updateBlock(block, {
        type: "pdfAttachment",
        props: {
          url: url ?? "",
          fileName: file.name,
          fileSize: file.size,
        },
      });
    } catch (err) {
      console.error("PDF upload failed:", err);
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (!hasFile) {
    return (
      <div
        style={{
          border: "1px dashed var(--grove-border)",
          borderRadius: 6,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "var(--grove-surface-2)",
          color: "var(--grove-text-muted)",
          fontSize: 14,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
        <span>📄</span>
        <span>{uploading ? "Uploading…" : "Select a PDF file"}</span>
        {uploadError && (
          <span style={{ color: "#ff8080", fontSize: 12 }}>{uploadError}</span>
        )}
        {!uploading && (
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              marginLeft: "auto",
              padding: "4px 12px",
              borderRadius: 4,
              border: "1px solid var(--grove-border)",
              background: "transparent",
              color: "var(--grove-text-muted)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Browse
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid var(--grove-border)",
        borderRadius: 6,
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "var(--grove-surface-2)",
      }}
    >
      <span style={{ fontSize: 20 }}>📄</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            color: "var(--grove-text)",
            fontSize: 14,
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {block.props.fileName}
        </div>
        <div style={{ color: "var(--grove-text-muted)", fontSize: 12 }}>
          {formatFileSize(block.props.fileSize)}
        </div>
      </div>
      <a
        href={block.props.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          padding: "4px 12px",
          borderRadius: 4,
          border: "1px solid var(--grove-border)",
          color: "var(--grove-text-muted)",
          fontSize: 13,
          textDecoration: "none",
        }}
      >
        Open
      </a>
      <a
        href={block.props.url}
        download={block.props.fileName}
        style={{
          padding: "4px 12px",
          borderRadius: 4,
          border: "1px solid var(--grove-border)",
          color: "var(--grove-text-muted)",
          fontSize: 13,
          textDecoration: "none",
        }}
      >
        Download
      </a>
    </div>
  );
}

export const PDFAttachmentBlock = createReactBlockSpec(
  {
    type: "pdfAttachment" as const,
    propSchema: {
      url: { default: "" },
      fileName: { default: "" },
      fileSize: { default: 0 },
    },
    content: "none",
  },
  {
    render: PdfAttachmentRenderer,
  }
);
