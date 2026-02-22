"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Plus,
  Trash2,
  Lock,
  Unlock,
  MessageSquare,
  FileText,
  Link2,
  Loader2,
  Folder,
  FolderOpen,
  ChevronRight,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

export default function Sidebar() {
  const notes = useQuery(api.notes.list);
  const folders = useQuery(api.folders.list);
  const createNote = useMutation(api.notes.create);
  const removeNote = useMutation(api.notes.remove);
  const updateManagement = useMutation(api.notes.updateManagement);
  const moveNote = useMutation(api.folders.moveNote);
  const ingestSource = useAction(api.sources.ingest);
  const pathname = usePathname();
  const router = useRouter();
  const isLore = pathname.startsWith("/chat");

  const [sourceUrl, setSourceUrl] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [ingestError, setIngestError] = useState<string | null>(null);
  // Set of expanded folder IDs (all expanded by default once folders load)
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  const handleCreateNote = async () => {
    const newId = await createNote();
    router.push(`/note/${newId}`);
  };

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = sourceUrl.trim();
    if (!url) return;
    setIngesting(true);
    setIngestError(null);
    try {
      const noteId = await ingestSource({ url });
      setSourceUrl("");
      router.push(`/note/${noteId}`);
    } catch (err: any) {
      setIngestError(err?.message ?? "Failed to ingest source");
    } finally {
      setIngesting(false);
    }
  };

  const handleDeleteNote = async (e: React.MouseEvent, noteId: Id<"notes">) => {
    e.preventDefault();
    e.stopPropagation();
    await removeNote({ noteId });
    if (pathname === `/note/${noteId}`) router.push("/");
  };

  const toggleFolder = (folderId: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  // Group notes by folderId
  const notesByFolder = new Map<string | null, typeof notes>([]);
  for (const note of notes ?? []) {
    const key = note.folderId ?? null;
    const existing = notesByFolder.get(key) ?? [];
    notesByFolder.set(key, [...existing, note]);
  }

  const unfiledNotes = notesByFolder.get(null) ?? [];

  // Sort folders: Inbox first, then alphabetically
  const sortedFolders = [...(folders ?? [])].sort((a, b) => {
    if (a.name === "Inbox") return -1;
    if (b.name === "Inbox") return 1;
    return a.name.localeCompare(b.name);
  });

  const renderNoteItem = (note: NonNullable<typeof notes>[number], indent = false) => {
    const isActive = pathname === `/note/${note._id}`;
    return (
      <Link
        key={note._id}
        href={`/note/${note._id}`}
        className="group relative flex items-start gap-2.5 py-2 transition-colors duration-100"
        style={{
          paddingLeft: indent ? "2.25rem" : "1.25rem",
          paddingRight: "1.25rem",
          background: isActive ? "var(--grove-surface)" : "transparent",
          borderLeft: isActive
            ? "2px solid var(--grove-accent)"
            : "2px solid transparent",
        }}
      >
        <div className="flex-1 min-w-0 mt-px">
          <div
            className="truncate text-sm leading-snug"
            style={{
              color: isActive ? "var(--grove-text)" : "var(--grove-text-2)",
              fontWeight: isActive ? 500 : 400,
            }}
          >
            {note.title || "Untitled"}
          </div>
          <div
            className="text-[10px] mt-0.5 font-mono"
            style={{ color: "var(--grove-text-3)" }}
          >
            {formatRelativeTime(note.updatedAt)}
          </div>
        </div>
        <button
          onClick={(e) => handleDeleteNote(e, note._id)}
          className="p-1 rounded opacity-0 group-hover:opacity-100 transition-all duration-150 mt-0.5 shrink-0"
          style={{ color: "var(--grove-text-3)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "#f87171";
            (e.currentTarget as HTMLElement).style.background = "rgba(248, 113, 113, 0.1)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--grove-text-3)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
          aria-label={`Delete ${note.title}`}
        >
          <Trash2 size={12} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            updateManagement({
              noteId: note._id,
              managedBy: (note.managedBy ?? "ai") === "ai" ? "user" : "ai",
            });
          }}
          title={`Managed by ${note.managedBy ?? "ai"} — click to toggle`}
          className="opacity-0 group-hover:opacity-60 ml-auto shrink-0 p-0.5"
          style={{
            color:
              (note.managedBy ?? "ai") === "user"
                ? "var(--grove-accent)"
                : "var(--grove-text-3)",
          }}
        >
          {(note.managedBy ?? "ai") === "user" ? (
            <Lock size={9} />
          ) : (
            <Unlock size={9} />
          )}
        </button>
      </Link>
    );
  };

  return (
    <aside
      className="w-60 h-screen flex flex-col shrink-0"
      style={{
        background: "var(--grove-bg)",
        borderRight: "1px solid var(--grove-border)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-5"
        style={{ borderBottom: "1px solid var(--grove-border)" }}
      >
        <span
          className="text-xs font-semibold tracking-[0.2em] uppercase"
          style={{ color: "var(--grove-accent)", fontFamily: "var(--font-geist-mono)" }}
        >
          Grove
        </span>
        <button
          onClick={handleCreateNote}
          className="flex items-center justify-center w-6 h-6 rounded-md transition-all duration-150"
          style={{ color: "var(--grove-text-3)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--grove-accent)";
            (e.currentTarget as HTMLElement).style.background = "var(--grove-accent-dim)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--grove-text-3)";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
          aria-label="Create new note"
        >
          <Plus size={15} />
        </button>
      </div>

      {/* Nav toggle */}
      <div
        className="mx-3 mb-3 flex rounded-md overflow-hidden"
        style={{ border: "1px solid var(--grove-border)" }}
      >
        <button
          onClick={() => router.push("/chat")}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] transition-colors"
          style={{
            background: isLore ? "var(--grove-accent-dim)" : "transparent",
            color: isLore ? "var(--grove-accent)" : "var(--grove-text-3)",
            fontFamily: "var(--font-geist-mono)",
            borderRight: "1px solid var(--grove-border)",
          }}
        >
          <MessageSquare size={10} /> Lore
        </button>
        <button
          onClick={() => {
            const lastNote = localStorage.getItem("grove:lastNote");
            if (lastNote) router.push(`/note/${lastNote}`);
            else router.push("/");
          }}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] transition-colors"
          style={{
            background: !isLore ? "var(--grove-accent-dim)" : "transparent",
            color: !isLore ? "var(--grove-accent)" : "var(--grove-text-3)",
            fontFamily: "var(--font-geist-mono)",
          }}
        >
          <FileText size={10} /> Editor
        </button>
      </div>

      {/* Notes list with folders */}
      <nav className="flex-1 overflow-y-auto py-2">
        {notes === undefined ? (
          <div className="px-5 py-3 space-y-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-8 rounded animate-pulse"
                style={{ background: "var(--grove-surface)", opacity: 1 - i * 0.15 }}
              />
            ))}
          </div>
        ) : (
          <>
            {/* Folders */}
            {sortedFolders.map((folder) => {
              const folderNotes = notesByFolder.get(folder._id) ?? [];
              const isCollapsed = collapsedFolders.has(folder._id);
              return (
                <div key={folder._id}>
                  {/* Folder row */}
                  <button
                    onClick={() => toggleFolder(folder._id)}
                    className="w-full flex items-center gap-2 px-4 py-1.5 transition-colors"
                    style={{ color: "var(--grove-text-3)" }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.color = "var(--grove-text-2)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.color = "var(--grove-text-3)")
                    }
                  >
                    <ChevronRight
                      size={10}
                      className="shrink-0 transition-transform"
                      style={{ transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)" }}
                    />
                    {isCollapsed ? (
                      <Folder size={11} className="shrink-0" />
                    ) : (
                      <FolderOpen size={11} className="shrink-0" />
                    )}
                    <span
                      className="flex-1 text-left text-[11px] font-mono truncate"
                      style={{ color: "var(--grove-text-2)" }}
                    >
                      {folder.name}
                    </span>
                    <span
                      className="text-[9px] font-mono shrink-0"
                      style={{ color: "var(--grove-text-3)" }}
                    >
                      {folderNotes.length}
                    </span>
                  </button>

                  {/* Notes inside folder */}
                  {!isCollapsed &&
                    (folderNotes.length === 0 ? (
                      <div
                        className="px-10 py-1 text-[10px] font-mono"
                        style={{ color: "var(--grove-text-3)" }}
                      >
                        empty
                      </div>
                    ) : (
                      folderNotes.map((note) => renderNoteItem(note, true))
                    ))}
                </div>
              );
            })}

            {/* Unfiled notes */}
            {unfiledNotes.length > 0 && (
              <div>
                {sortedFolders.length > 0 && (
                  <div
                    className="px-4 pt-3 pb-1 text-[9px] font-mono uppercase tracking-widest"
                    style={{ color: "var(--grove-text-3)" }}
                  >
                    unfiled
                  </div>
                )}
                {unfiledNotes.map((note) => renderNoteItem(note, false))}
              </div>
            )}

            {/* True empty state */}
            {notes.length === 0 && (
              <div
                className="px-5 py-8 text-center text-xs"
                style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
              >
                no notes yet
              </div>
            )}
          </>
        )}
      </nav>

      {/* Source ingestion */}
      <div
        className="px-3 py-3 space-y-1.5"
        style={{ borderTop: "1px solid var(--grove-border)" }}
      >
        <div
          className="flex items-center gap-1.5 text-[10px] font-mono px-1"
          style={{ color: "var(--grove-text-3)" }}
        >
          <Link2 size={9} />
          ingest source → inbox
        </div>
        <form onSubmit={handleIngest} className="flex gap-1.5">
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => {
              setSourceUrl(e.target.value);
              setIngestError(null);
            }}
            placeholder="Paste URL..."
            disabled={ingesting}
            className="flex-1 min-w-0 rounded px-2 py-1 text-[11px] font-mono outline-none"
            style={{
              background: "var(--grove-surface)",
              border: "1px solid var(--grove-border)",
              color: "var(--grove-text)",
            }}
          />
          <button
            type="submit"
            disabled={ingesting || !sourceUrl.trim()}
            className="flex items-center justify-center w-7 h-[26px] rounded shrink-0 transition-all"
            style={{
              background:
                ingesting || !sourceUrl.trim()
                  ? "var(--grove-surface)"
                  : "var(--grove-accent-dim)",
              color:
                ingesting || !sourceUrl.trim()
                  ? "var(--grove-text-3)"
                  : "var(--grove-accent)",
              border: "1px solid var(--grove-border)",
            }}
            aria-label="Ingest source"
          >
            {ingesting ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Link2 size={11} />
            )}
          </button>
        </form>
        {ingestError && (
          <div
            className="text-[10px] font-mono leading-tight px-1"
            style={{ color: "#f87171" }}
          >
            {ingestError}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-5 py-2.5"
        style={{ borderTop: "1px solid var(--grove-border)" }}
      >
        <div
          className="text-[10px] font-mono"
          style={{ color: "var(--grove-text-3)" }}
        >
          {notes?.length ?? 0} {notes?.length === 1 ? "note" : "notes"}
        </div>
      </div>
    </aside>
  );
}
