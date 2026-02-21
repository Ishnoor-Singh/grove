"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FileText, Plus } from "lucide-react";

export default function Home() {
  const notes = useQuery(api.notes.list);
  const createNote = useMutation(api.notes.create);
  const router = useRouter();

  // If notes exist, redirect to the most recent one
  useEffect(() => {
    if (notes && notes.length > 0) {
      router.push(`/note/${notes[0]._id}`);
    }
  }, [notes, router]);

  const handleCreateNote = async () => {
    const newId = await createNote();
    router.push(`/note/${newId}`);
  };

  // Loading state
  if (notes === undefined) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  // Redirecting state (notes exist)
  if (notes.length > 0) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-gray-400">
          Opening your notes...
        </div>
      </div>
    );
  }

  // Empty state
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-light">
          <FileText size={32} className="text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Welcome to Grove
          </h1>
          <p className="mt-2 text-gray-500 max-w-sm">
            Your personal knowledge ecosystem. Create your first note to get
            started.
          </p>
        </div>
        <button
          onClick={handleCreateNote}
          className="flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          <Plus size={18} />
          Create your first note
        </button>
      </div>
    </div>
  );
}
