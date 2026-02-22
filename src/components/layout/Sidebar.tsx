"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Lock,
  Unlock,
  MessageSquare,
  FileText,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FilePlus,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";

type NoteItem = {
  _id: Id<"notes">;
  title: string;
  updatedAt: number;
  createdAt: number;
  folderId?: Id<"folders">;
  tags?: string[];
  managedBy?: "ai" | "user";
};

type FolderItem = {
  _id: Id<"folders">;
  name: string;
  parentId?: Id<"folders">;
  createdAt: number;
  updatedAt: number;
};

// Payload stored in dataTransfer during a drag
type DragPayload = { type: "note"; id: string } | { type: "folder"; id: string };

function setDrag(e: React.DragEvent, payload: DragPayload) {
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("application/grove+json", JSON.stringify(payload));
}

function getDrag(e: React.DragEvent): DragPayload | null {
  try {
    return JSON.parse(e.dataTransfer.getData("application/grove+json"));
  } catch {
    return null;
  }
}

function FolderNode({
  folder,
  allFolders,
  notes,
  depth,
  onCreateNote,
  onDeleteNote,
  pathname,
  renamingFolderId,
  onSetRenamingFolderId,
}: {
  folder: FolderItem;
  allFolders: FolderItem[];
  notes: NoteItem[];
  depth: number;
  onCreateNote: (folderId: Id<"folders">) => void;
  onDeleteNote: (e: React.MouseEvent, noteId: Id<"notes">) => void;
  pathname: string;
  renamingFolderId: Id<"folders"> | null;
  onSetRenamingFolderId: (id: Id<"folders"> | null) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);
  const [isDragOver, setIsDragOver] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);
  const renameFolder = useMutation(api.folders.rename);
  const removeFolder = useMutation(api.folders.remove);
  const createSubfolder = useMutation(api.folders.create);
  const moveFolder = useMutation(api.folders.move);
  const moveNote = useMutation(api.notes.moveToFolder);

  const childFolders = allFolders.filter((f) => f.parentId === folder._id);
  const folderNotes = notes.filter((n) => n.folderId === folder._id);

  // Auto-enter rename mode when this folder was just created
  useEffect(() => {
    if (renamingFolderId === folder._id) {
      setIsRenaming(true);
      setTimeout(() => {
        renameRef.current?.focus();
        renameRef.current?.select();
      }, 0);
    }
  }, [renamingFolderId, folder._id]);

  const handleRename = async () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== folder.name) {
      await renameFolder({ folderId: folder._id, name: trimmed });
    } else if (!trimmed) {
      setRenameValue(folder.name);
    }
    setIsRenaming(false);
    onSetRenamingFolderId(null);
  };

  const handleCreateSubfolder = async () => {
    const newId = await createSubfolder({ name: "New Folder", parentId: folder._id });
    setExpanded(true);
    onSetRenamingFolderId(newId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const payload = getDrag(e);
    // Don't allow dropping a folder onto itself
    if (payload?.type === "folder" && payload.id === folder._id) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const payload = getDrag(e);
    if (!payload) return;
    if (payload.type === "note") {
      await moveNote({ noteId: payload.id as Id<"notes">, folderId: folder._id });
      setExpanded(true);
    } else if (payload.type === "folder" && payload.id !== folder._id) {
      await moveFolder({ folderId: payload.id as Id<"folders">, parentId: folder._id });
      setExpanded(true);
    }
  };

  const indentStyle = { paddingLeft: `${(depth + 1) * 12 + 8}px` };

  return (
    <div>
      {/* Folder row */}
      <div
        className="group flex items-center gap-1 py-1.5 pr-2 cursor-pointer transition-colors duration-100"
        style={{
          ...indentStyle,
          color: "var(--grove-text-2)",
          background: isDragOver ? "var(--grove-accent-dim)" : "transparent",
          outline: isDragOver ? "1px solid var(--grove-accent-border)" : "none",
          borderRadius: isDragOver ? "4px" : undefined,
        }}
        onClick={() => !isRenaming && setExpanded((v) => !v)}
        onDoubleClick={() => {
          setRenameValue(folder.name);
          setIsRenaming(true);
          setTimeout(() => renameRef.current?.select(), 0);
        }}
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          setDrag(e, { type: "folder", id: folder._id });
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span style={{ color: "var(--grove-text-3)" }} className="shrink-0">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <span style={{ color: "var(--grove-text-3)" }} className="shrink-0">
          {expanded ? <FolderOpen size={13} /> : <Folder size={13} />}
        </span>

        {isRenaming ? (
          <input
            ref={renameRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") {
                setRenameValue(folder.name);
                setIsRenaming(false);
                onSetRenamingFolderId(null);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 text-xs bg-transparent border-none outline-none"
            style={{ color: "var(--grove-text)", fontFamily: "inherit" }}
            autoFocus
          />
        ) : (
          <span className="flex-1 min-w-0 truncate text-xs font-medium">
            {folder.name}
          </span>
        )}

        {/* Folder actions */}
        {!isRenaming && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCreateNote(folder._id);
                setExpanded(true);
              }}
              title="New note in folder"
              className="p-0.5 rounded transition-colors"
              style={{ color: "var(--grove-text-3)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--grove-accent)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--grove-text-3)";
              }}
            >
              <FilePlus size={11} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCreateSubfolder();
              }}
              title="New subfolder"
              className="p-0.5 rounded transition-colors"
              style={{ color: "var(--grove-text-3)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--grove-accent)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--grove-text-3)";
              }}
            >
              <FolderPlus size={11} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeFolder({ folderId: folder._id });
              }}
              title="Delete folder"
              className="p-0.5 rounded transition-colors"
              style={{ color: "var(--grove-text-3)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color = "#f87171";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color = "var(--grove-text-3)";
              }}
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>

      {/* Folder contents */}
      {expanded && (
        <div>
          {childFolders.map((child) => (
            <FolderNode
              key={child._id}
              folder={child}
              allFolders={allFolders}
              notes={notes}
              depth={depth + 1}
              onCreateNote={onCreateNote}
              onDeleteNote={onDeleteNote}
              pathname={pathname}
              renamingFolderId={renamingFolderId}
              onSetRenamingFolderId={onSetRenamingFolderId}
            />
          ))}
          {folderNotes.map((note) => (
            <NoteRow
              key={note._id}
              note={note}
              depth={depth + 1}
              isActive={pathname === `/note/${note._id}`}
              onDelete={onDeleteNote}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteRow({
  note,
  depth,
  isActive,
  onDelete,
}: {
  note: NoteItem;
  depth: number;
  isActive: boolean;
  onDelete: (e: React.MouseEvent, noteId: Id<"notes">) => void;
}) {
  const updateManagement = useMutation(api.notes.updateManagement);

  return (
    <Link
      href={`/note/${note._id}`}
      draggable
      onDragStart={(e) => {
        setDrag(e, { type: "note", id: note._id });
      }}
      className="group relative flex items-start gap-2 pr-2 py-2 transition-colors duration-100"
      style={{
        paddingLeft: `${(depth + 1) * 12 + 8}px`,
        background: isActive ? "var(--grove-surface)" : "transparent",
        borderLeft: isActive
          ? "2px solid var(--grove-accent)"
          : "2px solid transparent",
      }}
    >
      <FileText
        size={12}
        className="shrink-0 mt-0.5"
        style={{ color: "var(--grove-text-3)" }}
      />
      <div className="flex-1 min-w-0">
        <div
          className="truncate text-xs leading-snug"
          style={{
            color: isActive ? "var(--grove-text)" : "var(--grove-text-2)",
            fontWeight: isActive ? 500 : 400,
          }}
        >
          {note.title || "Untitled"}
        </div>
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-0.5">
            {note.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[9px] px-1 py-px rounded-sm font-mono"
                style={{
                  background: "var(--grove-accent-dim)",
                  color: "var(--grove-accent)",
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
        <div
          className="text-[10px] mt-0.5 font-mono"
          style={{ color: "var(--grove-text-3)" }}
        >
          {formatRelativeTime(note.updatedAt)}
        </div>
      </div>
      <button
        onClick={(e) => onDelete(e, note._id)}
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
        <Trash2 size={11} />
      </button>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          updateManagement({
            noteId: note._id,
            managedBy: (note.managedBy ?? "ai") === "ai" ? "user" : "ai",
          });
        }}
        title={`Managed by ${note.managedBy ?? "ai"} — click to toggle`}
        className="opacity-0 group-hover:opacity-60 shrink-0 p-0.5 mt-0.5"
        style={{ color: (note.managedBy ?? "ai") === "user" ? "var(--grove-accent)" : "var(--grove-text-3)" }}
      >
        {(note.managedBy ?? "ai") === "user" ? <Lock size={9} /> : <Unlock size={9} />}
      </button>
    </Link>
  );
}

export default function Sidebar() {
  const notes = useQuery(api.notes.list);
  const folders = useQuery(api.folders.list);
  const createNote = useMutation(api.notes.create);
  const removeNote = useMutation(api.notes.remove);
  const createFolder = useMutation(api.folders.create);
  const moveNote = useMutation(api.notes.moveToFolder);
  const pathname = usePathname();
  const router = useRouter();
  const isLore = pathname.startsWith("/chat");
  const [renamingFolderId, setRenamingFolderId] = useState<Id<"folders"> | null>(null);
  const [unfiledDragOver, setUnfiledDragOver] = useState(false);

  const handleCreateNote = async (folderId?: Id<"folders">) => {
    const newId = await createNote({ folderId });
    router.push(`/note/${newId}`);
  };

  const handleDeleteNote = async (
    e: React.MouseEvent,
    noteId: Id<"notes">
  ) => {
    e.preventDefault();
    e.stopPropagation();
    await removeNote({ noteId });
    if (pathname === `/note/${noteId}`) router.push("/");
  };

  const handleCreateFolder = async () => {
    const newId = await createFolder({ name: "New Folder" });
    setRenamingFolderId(newId);
  };

  const rootFolders = folders?.filter((f) => !f.parentId) ?? [];
  const unfiledNotes = notes?.filter((n) => !n.folderId) ?? [];

  const isLoading = notes === undefined || folders === undefined;

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
          style={{
            color: "var(--grove-accent)",
            fontFamily: "var(--font-geist-mono)",
          }}
        >
          Grove
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCreateFolder}
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
            aria-label="Create new folder"
            title="New folder"
          >
            <FolderPlus size={14} />
          </button>
          <button
            onClick={() => handleCreateNote()}
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
            title="New note"
          >
            <Plus size={15} />
          </button>
        </div>
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

      {/* Tree */}
      <nav className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          <div className="px-5 py-3 space-y-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-8 rounded animate-pulse"
                style={{
                  background: "var(--grove-surface)",
                  opacity: 1 - i * 0.15,
                }}
              />
            ))}
          </div>
        ) : notes.length === 0 && folders.length === 0 ? (
          <div
            className="px-5 py-8 text-center text-xs"
            style={{
              color: "var(--grove-text-3)",
              fontFamily: "var(--font-geist-mono)",
            }}
          >
            no notes yet
          </div>
        ) : (
          <>
            {/* Folders */}
            {rootFolders.map((folder) => (
              <FolderNode
                key={folder._id}
                folder={folder}
                allFolders={folders ?? []}
                notes={notes ?? []}
                depth={0}
                onCreateNote={handleCreateNote}
                onDeleteNote={handleDeleteNote}
                pathname={pathname}
                renamingFolderId={renamingFolderId}
                onSetRenamingFolderId={setRenamingFolderId}
              />
            ))}

            {/* Unfiled notes — also a drop target */}
            {unfiledNotes.length > 0 && (
              <>
                {rootFolders.length > 0 && (
                  <div
                    className="px-4 pt-3 pb-1 text-[10px] font-mono uppercase tracking-widest transition-colors"
                    style={{
                      color: unfiledDragOver ? "var(--grove-accent)" : "var(--grove-text-3)",
                      background: unfiledDragOver ? "var(--grove-accent-dim)" : "transparent",
                      borderRadius: "4px",
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setUnfiledDragOver(true);
                    }}
                    onDragLeave={() => setUnfiledDragOver(false)}
                    onDrop={async (e) => {
                      e.preventDefault();
                      setUnfiledDragOver(false);
                      const payload = getDrag(e);
                      if (payload?.type === "note") {
                        await moveNote({ noteId: payload.id as Id<"notes">, folderId: undefined });
                      }
                    }}
                  >
                    Unfiled
                  </div>
                )}
                {unfiledNotes.map((note) => {
                  const isActive = pathname === `/note/${note._id}`;
                  return (
                    <NoteRow
                      key={note._id}
                      note={note}
                      depth={0}
                      isActive={isActive}
                      onDelete={handleDeleteNote}
                    />
                  );
                })}
              </>
            )}
          </>
        )}
      </nav>

      {/* Footer */}
      <div
        className="px-5 py-3"
        style={{ borderTop: "1px solid var(--grove-border)" }}
      >
        <div
          className="text-[10px] font-mono"
          style={{ color: "var(--grove-text-3)" }}
        >
          {notes?.length ?? 0} {notes?.length === 1 ? "note" : "notes"}
          {folders && folders.length > 0 &&
            ` · ${folders.length} ${folders.length === 1 ? "folder" : "folders"}`}
        </div>
      </div>
    </aside>
  );
}
