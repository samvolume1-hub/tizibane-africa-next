import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createJaasToken, getJaasAppId } from "@/lib/jaas";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid call." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to join this call." }, { status: 401 });

  const [{ data: session }, { data: participant }] = await Promise.all([
    supabase.from("call_sessions").select("id,conversation_id,room_name,started_by,status,call_type").eq("id", id).maybeSingle(),
    supabase.from("call_participants").select("status").eq("call_id", id).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!session || !participant || !["ringing", "active"].includes(session.status) || !["invited", "joined"].includes(participant.status)) {
    return NextResponse.json({ error: "You are not invited to this call, or it has ended." }, { status: 403 });
  }

  const { data: profile } = await supabase.from("profiles").select("display_name,avatar_path").eq("id", user.id).maybeSingle();
  const { error: updateError } = await supabase.from("call_participants")
    .update({ status: "joined", joined_at: new Date().toISOString(), left_at: null })
    .eq("call_id", id)
    .eq("user_id", user.id);
  if (updateError) return NextResponse.json({ error: "Your call invitation could not be accepted." }, { status: 500 });

  try {
    const token = createJaasToken({
      roomName: session.room_name,
      user: {
        id: user.id,
        name: profile?.display_name || user.email || "TIZIBANE member",
        email: user.email,
        moderator: session.started_by === user.id,
      },
    });
    return NextResponse.json({
      callId: session.id,
      roomName: session.room_name,
      callType: session.call_type,
      appId: getJaasAppId(),
      token,
    });
  } catch {
    return NextResponse.json({ error: "Secure calling is not configured on the server yet." }, { status: 503 });
  }
}
