"use client";

import { TAG_COLORS, type TagType } from "@/lib/ai-provider";

interface AITagBadgeProps {
  tag: string;
  confidence?: number;
}

export default function AITagBadge({ tag, confidence }: AITagBadgeProps) {
  const tagKey = tag as TagType;
  const colors = TAG_COLORS[tagKey];

  if (!colors) return null;

  const opacityStyle =
    confidence !== undefined ? { opacity: 0.5 + confidence * 0.5 } : undefined;

  return (
    <span
      className={`${colors.bg} ${colors.text} text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1`}
      style={opacityStyle}
    >
      {colors.label}
      {confidence !== undefined && (
        <span className="opacity-60 text-[10px]">
          {Math.round(confidence * 100)}%
        </span>
      )}
    </span>
  );
}
