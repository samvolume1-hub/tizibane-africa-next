"use client";

import { useEffect, useState } from "react";
import { CallControls } from "@/components/call-controls";

export function GroupCallControls({ groupId, userId }: { groupId: string; userId: string }) {
  const [conversationId, setConversationId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/calls/group-conversation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId }),
    }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Group calling is unavailable.");
      if (active) setConversationId(result.conversationId);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Group calling is unavailable.");
    });
    return () => { active = false; };
  }, [groupId]);

  if (error) return <p role="status" style={{ color: "#f4d7f4", fontSize: 12 }}>{error}</p>;
  if (!conversationId) return <p role="status" style={{ color: "#f4d7f4", fontSize: 12 }}>Preparing secure group calls…</p>;
  return <CallControls conversationId={conversationId} userId={userId} />;
}
