import NoteWorkspace from "./NoteWorkspace";

export default async function NotePage({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  const { noteId } = await params;
  return <NoteWorkspace noteId={noteId} />;
}
