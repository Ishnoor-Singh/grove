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
  claim: { bg: "bg-blue-100", text: "text-blue-700", label: "Claim" },
  question: { bg: "bg-purple-100", text: "text-purple-700", label: "Question" },
  action_item: { bg: "bg-orange-100", text: "text-orange-700", label: "Action Item" },
  source_needed: { bg: "bg-red-100", text: "text-red-700", label: "Source Needed" },
  idea: { bg: "bg-green-100", text: "text-green-700", label: "Idea" },
  reference: { bg: "bg-gray-100", text: "text-gray-700", label: "Reference" },
  definition: { bg: "bg-teal-100", text: "text-teal-700", label: "Definition" },
  counterpoint: { bg: "bg-amber-100", text: "text-amber-700", label: "Counterpoint" },
};

export type CommentType = "improve" | "fact_check" | "link_notes" | "elaborate";
