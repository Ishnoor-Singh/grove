"use client";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export default function ChatIndexPage() {
  const createSession = useMutation(api.loreConversations.create);
  const router = useRouter();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;
    createSession().then((id) => router.replace(`/chat/${id}`));
  }, [createSession, router]);

  return (
    <div
      className="flex h-screen items-center justify-center"
      style={{ background: "var(--grove-bg)" }}
    >
      <div
        className="text-xs animate-pulse tracking-[0.2em] uppercase"
        style={{ color: "var(--grove-text-3)", fontFamily: "var(--font-geist-mono)" }}
      >
        Starting session...
      </div>
    </div>
  );
}
