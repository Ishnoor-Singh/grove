"use client";

import dynamic from "next/dynamic";

const GraphView = dynamic(() => import("./GraphView"), { ssr: false });

export default function GraphPage() {
  return (
    <div style={{ width: "100vw", height: "100vh", background: "var(--grove-bg)" }}>
      <GraphView />
    </div>
  );
}
