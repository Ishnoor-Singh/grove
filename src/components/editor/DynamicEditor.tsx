"use client";

import dynamic from "next/dynamic";

const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
  loading: () => <div className="p-8 animate-pulse">Loading editor...</div>,
});

export default Editor;
