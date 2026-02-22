"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2, Lock, Unlock, MessageSquare, FileText, Search, X } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

export default function Sidebar() {
  const notes = useQuery(api.notes.list);
  const createNote = useMutation(api.notes.create);
  const removeNote = useMutation(api.notes.remove);
  const updateManagement = useMutation(api.notes.updateManagement);
  const semanticSearch = useAction(api.search.semanticSearch);
  const pathname = usePathname();
  const router = useRouter();
  const isLore = pathname.startsWith("/chat");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof notes | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await semanticSearch({ query: searchQuery });
      setSearchResults(results as typeof notes);
    } catch (err) {
      console.error("Semantic search failed:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  const handleCreateNote = async () => {
    const newId = await createNote();
    router.push(`/note/${newId}`);
  };

  const handleDeleteNote = async (e: React.MouseEvent, noteId: Id<"notes">) => {
    e.preventDefault();
    e.stopPropagation();
    await removeNote({ noteId });
    if (pathname === `/note/${noteId}`) router.push("/");
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
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = "var(--grove-accent)";
            (e.currentTarget as HTMLElement).style.background = "var(--grove-accent-dim)";
          }}
          onMouseLeave={e => {
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

      {/* Search */}
      <div className="px-3 pb-2">
        <form onSubmit={handleSearch}>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md"
            style={{
              background: "var(--grove-surface)",
              border: "1px solid var(--grove-border)",
            }}
          >
            <Search size={11} style={{ color: "var(--grove-text-3)", flexShrink: 0 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!e.target.value.trim()) setSearchResults(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleClearSearch();
              }}
              placeholder="semantic search..."
              className="flex-1 bg-transparent text-[11px] outline-none min-w-0"
              style={{
                color: "var(--grove-text-2)",
                fontFamily: "var(--font-geist-mono)",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="shrink-0"
                style={{ color: "var(--grove-text-3)" }}
              >
                <X size={11} />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Notes list */}
      <nav className="flex-1 overflow-y-auto py-2">
        {isSearching ? (
          <div className="px-5 py-3 space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-8 rounded animate-pulse"
                style={{
                  background: "var(--grove-surface)",
                  opacity: 1 - i * 0.2,
                }}
              />
            ))}
            <div
              className="text-[10px] text-center font-mono pt-1"
              style={{ color: "var(--grove-text-3)" }}
            >
              searching...
            </div>
          </div>
        ) : notes === undefined ? (
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
        ) : searchResults !== null && searchResults.length === 0 ? (
          <div
            className="px-5 py-8 text-center text-xs"
            style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
          >
            no results
          </div>
        ) : (searchResults ?? notes).length === 0 ? (
          <div
            className="px-5 py-8 text-center text-xs"
            style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
          >
            no notes yet
          </div>
        ) : (
          (searchResults ?? notes).map((note) => {
            const isActive = pathname === `/note/${note._id}`;
            return (
              <Link
                key={note._id}
                href={`/note/${note._id}`}
                className="group relative flex items-start gap-2.5 px-5 py-2.5 transition-colors duration-100"
                style={{
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
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.color = "#f87171";
                    (e.currentTarget as HTMLElement).style.background = "rgba(248, 113, 113, 0.1)";
                  }}
                  onMouseLeave={e => {
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
                  style={{ color: (note.managedBy ?? "ai") === "user" ? "var(--grove-accent)" : "var(--grove-text-3)" }}
                >
                  {(note.managedBy ?? "ai") === "user" ? <Lock size={9} /> : <Unlock size={9} />}
                </button>
              </Link>
            );
          })
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
          {searchResults !== null
            ? `${searchResults.length} result${searchResults.length === 1 ? "" : "s"}`
            : `${notes?.length ?? 0} ${notes?.length === 1 ? "note" : "notes"}`}
        </div>
      </div>
    </aside>
  );
}
