"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef } from "react";
import { ForceGraph2D } from "react-force-graph";
import { Check, X } from "lucide-react";

export default function GraphView() {
  const router = useRouter();
  const notes = useQuery(api.notes.list);
  const links = useQuery(api.noteLinks.list);
  const acceptLink = useMutation(api.noteLinks.accept);
  const dismissLink = useMutation(api.noteLinks.dismiss);
  const containerRef = useRef<HTMLDivElement>(null);

  const graphData = useMemo(() => {
    if (!notes || !links) return { nodes: [], links: [] };

    const noteIdSet = new Set(notes.map((n) => n._id));

    const nodes = notes.map((note) => ({
      id: note._id,
      name: note.title || "Untitled",
      val: 4,
      color: "#89b4ff",
    }));

    const graphLinks = links
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
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
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
    (node: any) => {
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
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
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
          background: "rgba(15,22,32,0.8)",
          border: "1px solid #172338",
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
            background: "rgba(11,16,24,0.92)",
            border: "1px solid #172338",
            borderRadius: 8,
            padding: "10px 0",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            style={{
              padding: "0 12px 8px",
              fontSize: 10,
              color: "#374d68",
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
                  {noteTitleMap[link.sourceNoteId]} →{" "}
                  {noteTitleMap[link.targetNoteId]}
                </span>
                <button
                  onClick={() => acceptLink({ linkId: link._id })}
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
                  onClick={() => dismissLink({ linkId: link._id })}
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
        linkColor={(link: any) => link.color}
        linkWidth={1}
        linkDirectionalParticles={0}
        width={typeof window !== "undefined" ? window.innerWidth : 1200}
        height={typeof window !== "undefined" ? window.innerHeight : 800}
      />
    </div>
  );
}
