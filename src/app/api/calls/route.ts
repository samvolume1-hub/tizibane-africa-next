import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createJaasToken, getJaasAppId } from "@/lib/jaas";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to start a call." }, { status: 401 });

  let body: { conversationId?: string; callType?: "audio" | "video" };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid call request." }, { status: 400 });
  }
  const conversationId = body.conversationId;
  const callType = body.callType;
  if (!conversationId || !/^[0-9a-f-]{36}$/i.test(conversationId) || !["audio", "video"].includes(callType ?? "")) {
    return NextResponse.json({ error: "Choose a valid conversation and call type." }, { status: 400 });
  }

  const { data: conversation } = await supabase.from("conversations")
    .select("id,is_group,group_id")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conversation) {
    return NextResponse.json({ error: "This conversation is not available to your account." }, { status: 403 });
  }

  let memberIds: string[] = [];
  if (conversation.is_group && conversation.group_id) {
    const [{ data: groupMembership }, { data: groupMembers }, { data: group }] = await Promise.all([
      supabase.from("group_members").select("status").eq("group_id", conversation.group_id).eq("user_id", user.id).maybeSingle(),
      supabase.from("group_members").select("user_id").eq("group_id", conversation.group_id).eq("status", "active"),
      supabase.from("groups").select("owner_id").eq("id", conversation.group_id).maybeSingle(),
    ]);
    if (groupMembership?.status !== "active" && group?.owner_id !== user.id) {
      return NextResponse.json({ error: "Only active group members can start group calls." }, { status: 403 });
    }
    memberIds = [...new Set([...(groupMembers ?? []).map((member) => member.user_id), ...(group?.owner_id ? [group.owner_id] : [])])];
  } else {
    const { data: members } = await supabase.from("conversation_members")
      .select("user_id")
      .eq("conversation_id", conversationId);
    memberIds = [...new Set((members ?? []).map((member) => member.user_id))];
  }

  if (!memberIds.includes(user.id)) {
    return NextResponse.json({ error: "This conversation is not available to your account." }, { status: 403 });
  }
  if (memberIds.length < 2) {
    return NextResponse.json({ error: "A call needs at least two conversation members." }, { status: 400 });
  }

  const { data: profile } = await supabase.from("profiles").select("display_name,avatar_path").eq("id", user.id).maybeSingle();
  const { data: session, error: createError } = await supabase
    .from("call_sessions")
    .insert({ conversation_id: conversationId, started_by: user.id, call_type: callType, status: "ringing" })
    .select("id,room_name")
    .single();

  if (createError || !session) {
    return NextResponse.json({ error: "The call could not be started. Please try again." }, { status: 500 });
  }

  const participants = memberIds.map((userId) => ({
    call_id: session.id,
    conversation_id: conversationId,
    user_id: userId,
    invited_by: user.id,
    status: userId === user.id ? "joined" : "invited",
    ...(userId === user.id ? { joined_at: new Date().toISOString() } : {}),
  }));
  const { error: participantError } = await supabase.from("call_participants").insert(participants);
  if (participantError) {
    await supabase.from("call_sessions").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", session.id);
    return NextResponse.json({ error: "The call invitations could not be created." }, { status: 500 });
  }

  try {
    const token = createJaasToken({
      roomName: session.room_name,
      user: {
        id: user.id,
        name: profile?.display_name || user.email || "TIZIBANE member",
        email: user.email,
        moderator: true,
      },
    });
    return NextResponse.json({
      callId: session.id,
      roomName: session.room_name,
      callType,
      isInitiator: true,
      appId: getJaasAppId(),
      token,
    });
  } catch {
    await supabase.from("call_sessions").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", session.id);
    return NextResponse.json({ error: "Secure calling is not configured on the server yet." }, { status: 503 });
  }
}
