"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus, FileText, Trash2 } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

export default function Sidebar() {
  const notes = useQuery(api.notes.list);
  const createNote = useMutation(api.notes.create);
  const removeNote = useMutation(api.notes.remove);
  const pathname = usePathname();
  const router = useRouter();

  const handleCreateNote = async () => {
    const newId = await createNote();
    router.push(`/note/${newId}`);
  };

  const handleDeleteNote = async (
    e: React.MouseEvent,
    noteId: Id<"notes">
  ) => {
    e.preventDefault();
    e.stopPropagation();
    await removeNote({ noteId });

    // If we're viewing the deleted note, navigate away
    if (pathname === `/note/${noteId}`) {
      router.push("/");
    }
  };

  return (
    <aside className="w-64 bg-sidebar-bg border-r border-sidebar-border h-screen overflow-y-auto flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border">
        <h1 className="text-lg font-semibold text-foreground">Grove</h1>
        <button
          onClick={handleCreateNote}
          className="p-1.5 rounded-md hover:bg-accent-light text-foreground hover:text-accent transition-colors"
          aria-label="Create new note"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Notes list */}
      <nav className="flex-1 overflow-y-auto py-2">
        {notes === undefined ? (
          <div className="px-4 py-2 text-sm text-gray-400">Loading...</div>
        ) : notes.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            No notes yet
          </div>
        ) : (
          notes.map((note) => {
            const isActive = pathname === `/note/${note._id}`;
            return (
              <Link
                key={note._id}
                href={`/note/${note._id}`}
                className={`group flex items-start gap-2 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-accent-light text-accent"
                    : "text-foreground hover:bg-gray-100"
                }`}
              >
                <FileText
                  size={16}
                  className={`mt-0.5 shrink-0 ${isActive ? "text-accent" : "text-gray-400"}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">
                    {note.title || "Untitled"}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {formatRelativeTime(note.updatedAt)}
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteNote(e, note._id)}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-all"
                  aria-label={`Delete ${note.title}`}
                >
                  <Trash2 size={14} />
                </button>
              </Link>
            );
          })
        )}
      </nav>
    </aside>
  );
}
