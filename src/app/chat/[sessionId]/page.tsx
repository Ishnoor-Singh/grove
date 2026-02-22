import LoreWorkspace from "./LoreWorkspace";

export default async function ChatSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <LoreWorkspace sessionId={sessionId} />;
}
