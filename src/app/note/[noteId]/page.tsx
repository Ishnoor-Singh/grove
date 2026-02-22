import { Suspense } from "react";
import NoteWorkspace from "./NoteWorkspace";

export default async function NotePage({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  const { noteId } = await params;
  return (
    <Suspense fallback={<div style={{ background: "var(--grove-bg)" }} className="h-screen" />}>
      <NoteWorkspace noteId={noteId} />
    </Suspense>
  );
}
