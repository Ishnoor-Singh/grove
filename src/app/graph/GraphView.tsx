"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ForceGraph2D } from "react-force-graph";
import { Check, X } from "lucide-react";

interface GraphNode {
  id: string;
  name: string;
  val: number;
  color: string;
  x?: number;
  y?: number;
}

interface GraphLink {
  id: string;
  source: string;
  target: string;
  status: string;
  color: string;
}

export default function GraphView() {
  const router = useRouter();
  const notes = useQuery(api.notes.list);
  const links = useQuery(api.noteLinks.list);
  const acceptLink = useMutation(api.noteLinks.accept);
  const dismissLink = useMutation(api.noteLinks.dismiss);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setDimensions({ width: window.innerWidth, height: window.innerHeight });
    const handleResize = () =>
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const graphData = useMemo(() => {
    if (!notes || !links) return { nodes: [], links: [] };

    const noteIdSet = new Set(notes.map((n) => n._id));

    const nodes: GraphNode[] = notes.map((note) => ({
      id: note._id,
      name: note.title || "Untitled",
      val: 4,
      color: "#89b4ff",
    }));

    const graphLinks: GraphLink[] = links
      .filter(
        (l) =>
          noteIdSet.has(l.sourceNoteId) && noteIdSet.has(l.targetNoteId)
      )
      .map((l) => ({
        id: l._id,
        source: l.sourceNoteId,
        target: l.targetNoteId,
        status: l.status,
        color:
          l.status === "accepted"
            ? "rgba(137,180,255,0.35)"
            : "rgba(55,77,104,0.5)",
      }));

    return { nodes, links: graphLinks };
  }, [notes, links]);

  const pendingLinks = useMemo(
    () => (links ?? []).filter((l) => l.status === "pending"),
    [links]
  );

  const paintNode = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (node.x === undefined || node.y === undefined) return;
      const r = node.val ?? 4;
      ctx.shadowBlur = 16;
      ctx.shadowColor = "#89b4ff";
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = "#89b4ff";
      ctx.fill();
      ctx.shadowBlur = 0;

      const fontSize = Math.max(10 / globalScale, 3);
      ctx.font = `${fontSize}px monospace`;
      ctx.fillStyle = "rgba(224,218,206,0.85)";
      ctx.textAlign = "center";
      ctx.fillText(node.name, node.x, node.y + r + fontSize + 1);
    },
    []
  );

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      router.push(`/note/${node.id}`);
    },
    [router]
  );

  const noteTitleMap = useMemo(() => {
    const map: Record<string, string> = {};
    (notes ?? []).forEach((n) => {
      map[n._id] = n.title || "Untitled";
    });
    return map;
  }, [notes]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Back to notes */}
      <button
        onClick={() => router.push("/")}
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 10,
          padding: "6px 12px",
          fontSize: 11,
          fontFamily: "monospace",
          background: "var(--grove-bg)",
          border: "1px solid var(--grove-border)",
          borderRadius: 6,
          color: "#89b4ff",
          cursor: "pointer",
        }}
      >
        ← notes
      </button>

      {/* Graph title */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          fontSize: 11,
          fontFamily: "monospace",
          color: "rgba(137,180,255,0.5)",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}
      >
        Knowledge Graph
      </div>

      {/* Pending suggestions panel */}
      {pendingLinks.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 10,
            width: 260,
            background: "var(--grove-bg)",
            border: "1px solid var(--grove-border)",
            borderRadius: 8,
            padding: "10px 0",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            style={{
              padding: "0 12px 8px",
              fontSize: 10,
              color: "var(--grove-text-3)",
              fontFamily: "monospace",
              letterSpacing: "0.1em",
            }}
          >
            {pendingLinks.length} SUGGESTED LINK
            {pendingLinks.length > 1 ? "S" : ""}
          </div>
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {pendingLinks.map((link) => (
              <div
                key={link._id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  fontSize: 11,
                  color: "#89b4ff",
                  fontFamily: "monospace",
                }}
              >
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 10,
                  }}
                >
                  {noteTitleMap[link.sourceNoteId] ?? "Untitled"} →{" "}
                  {noteTitleMap[link.targetNoteId] ?? "Untitled"}
                </span>
                <button
                  onClick={() => {
                    acceptLink({ linkId: link._id }).catch((err) =>
                      console.error("Failed to accept link:", err)
                    );
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#7defa8",
                    padding: 2,
                    flexShrink: 0,
                  }}
                  title="Accept"
                >
                  <Check size={12} />
                </button>
                <button
                  onClick={() => {
                    dismissLink({ linkId: link._id }).catch((err) =>
                      console.error("Failed to dismiss link:", err)
                    );
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#ff8080",
                    padding: 2,
                    flexShrink: 0,
                  }}
                  title="Dismiss"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <ForceGraph2D
        graphData={graphData}
        backgroundColor="#0b1018"
        nodeCanvasObject={paintNode}
        nodeCanvasObjectMode={() => "replace"}
        onNodeClick={handleNodeClick}
        enableNodeDrag={true}
        linkColor={(link: GraphLink) => link.color}
        linkWidth={1}
        linkDirectionalParticles={0}
        width={dimensions.width}
        height={dimensions.height}
      />
    </div>
  );
}
