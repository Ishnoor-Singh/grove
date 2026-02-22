"use client";
import { useState } from "react";
import { Search, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";

interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
}

interface WebSearchCardProps {
  query: string;
  results: SearchResult[];
}

export default function WebSearchCard({ query, results }: WebSearchCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  const getHostname = (url: string) => {
    try { return new URL(url).hostname; } catch { return url; }
  };

  return (
    <div
      className="rounded-md overflow-hidden mb-2"
      style={{ border: "1px solid var(--grove-border)", background: "var(--grove-surface-2)" }}
    >
      {/* Header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors"
        style={{ borderBottom: collapsed ? "none" : "1px solid var(--grove-border)" }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--grove-surface-3)"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
      >
        <Search size={11} style={{ color: "var(--grove-accent)", flexShrink: 0 }} />
        <span
          className="text-[11px] flex-1 text-left italic truncate"
          style={{ color: "var(--grove-text-2)", fontFamily: "var(--font-geist-mono)" }}
        >
          "{query}"
        </span>
        <span
          className="text-[10px] mr-1"
          style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
        >
          {results.length} result{results.length !== 1 ? "s" : ""}
        </span>
        {collapsed ? (
          <ChevronRight size={11} style={{ color: "var(--grove-text-3)" }} />
        ) : (
          <ChevronDown size={11} style={{ color: "var(--grove-text-3)" }} />
        )}
      </button>

      {/* Results */}
      {!collapsed && (
        <div>
          {results.map((r, i) => (
            <a
              key={i}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 px-3 py-2 transition-colors"
              style={{
                textDecoration: "none",
                borderTop: i > 0 ? "1px solid var(--grove-border)" : "none",
                display: "flex",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--grove-surface-3)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
            >
              <img
                src={`https://www.google.com/s2/favicons?domain=${getHostname(r.url)}&sz=16`}
                alt=""
                width={16}
                height={16}
                className="mt-0.5 rounded-sm shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span
                    className="text-[11px] font-medium truncate"
                    style={{ color: "var(--grove-text)" }}
                  >
                    {r.title}
                  </span>
                  <ExternalLink size={9} style={{ color: "var(--grove-text-3)", flexShrink: 0 }} />
                </div>
                <div
                  className="text-[10px] mt-0.5"
                  style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
                >
                  {getHostname(r.url)}
                </div>
                {r.snippet && (
                  <p
                    className="text-[11px] mt-1 line-clamp-2 leading-relaxed"
                    style={{ color: "var(--grove-text-2)" }}
                  >
                    {r.snippet}
                  </p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
