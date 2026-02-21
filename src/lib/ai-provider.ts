export type TagType =
  | "claim"
  | "question"
  | "action_item"
  | "source_needed"
  | "idea"
  | "reference"
  | "definition"
  | "counterpoint";

export const TAG_COLORS: Record<TagType, { bg: string; text: string; label: string }> = {
  claim:         { bg: "bg-sky-500/10",     text: "text-sky-300",     label: "Claim" },
  question:      { bg: "bg-violet-500/10",  text: "text-violet-300",  label: "Question" },
  action_item:   { bg: "bg-amber-500/10",   text: "text-amber-300",   label: "Action" },
  source_needed: { bg: "bg-rose-500/10",    text: "text-rose-300",    label: "Source?" },
  idea:          { bg: "bg-emerald-500/10", text: "text-emerald-300", label: "Idea" },
  reference:     { bg: "bg-slate-500/10",   text: "text-slate-300",   label: "Ref" },
  definition:    { bg: "bg-teal-500/10",    text: "text-teal-300",    label: "Def" },
  counterpoint:  { bg: "bg-orange-500/10",  text: "text-orange-300",  label: "Counter" },
};

export type CommentType = "improve" | "fact_check" | "link_notes" | "elaborate";
