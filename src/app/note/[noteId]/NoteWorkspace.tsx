"use client";

import { useState } from "react";
import AppShell from "@/components/layout/AppShell";
import DynamicEditor from "@/components/editor/DynamicEditor";

export default function NoteWorkspace({ noteId }: { noteId: string }) {
  const [showAISidebar, setShowAISidebar] = useState(false);

  return (
    <AppShell
      noteId={noteId}
      showAISidebar={showAISidebar}
      onToggleAISidebar={() => setShowAISidebar((s) => !s)}
    >
      <DynamicEditor key={noteId} noteId={noteId} />
    </AppShell>
  );
}
