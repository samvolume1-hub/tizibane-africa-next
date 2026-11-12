import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid call." }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to update this call." }, { status: 401 });

  let body: { action?: "decline" | "leave" | "end" };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid call action." }, { status: 400 });
  }
  if (!["decline", "leave", "end"].includes(body.action ?? "")) {
    return NextResponse.json({ error: "Unsupported call action." }, { status: 400 });
  }

  const { data: session } = await supabase.from("call_sessions")
    .select("id,started_by,status")
    .eq("id", id)
    .maybeSingle();
  const { data: participant } = await supabase.from("call_participants")
    .select("status")
    .eq("call_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session || !participant) return NextResponse.json({ error: "You are not a participant in this call." }, { status: 403 });

  if (body.action === "end" && session.started_by !== user.id) {
    return NextResponse.json({ error: "Only the call initiator can end the call for everyone." }, { status: 403 });
  }

  const participantStatus = body.action === "decline" ? "declined" : "left";
  const { error: participantError } = await supabase.from("call_participants")
    .update({ status: participantStatus, left_at: new Date().toISOString() })
    .eq("call_id", id)
    .eq("user_id", user.id);
  if (participantError) return NextResponse.json({ error: "Your call status could not be updated." }, { status: 500 });

  if (body.action === "end") {
    await supabase.from("call_sessions")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", id)
      .eq("started_by", user.id);
  }
  return NextResponse.json({ ok: true });
}
