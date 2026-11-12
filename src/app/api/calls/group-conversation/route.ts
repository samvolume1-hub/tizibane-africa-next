import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to access group calling." }, { status: 401 });

  let body: { groupId?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid group call request." }, { status: 400 });
  }
  const groupId = body.groupId;
  if (!groupId || !/^[0-9a-f-]{36}$/i.test(groupId)) {
    return NextResponse.json({ error: "Choose a valid group." }, { status: 400 });
  }

  const [{ data: group }, { data: membership }] = await Promise.all([
    supabase.from("groups").select("id,name,owner_id").eq("id", groupId).maybeSingle(),
    supabase.from("group_members").select("status").eq("group_id", groupId).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!group || (group.owner_id !== user.id && membership?.status !== "active")) {
    return NextResponse.json({ error: "Only active group members can use group calling." }, { status: 403 });
  }

  let { data: conversation } = await supabase.from("conversations")
    .select("id")
    .eq("group_id", groupId)
    .eq("is_group", true)
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    const { data, error } = await supabase.from("conversations")
      .insert({ title: group.name, is_group: true, group_id: groupId, created_by: user.id })
      .select("id")
      .single();
    if (error || !data) return NextResponse.json({ error: "The group's secure call space could not be prepared." }, { status: 500 });
    conversation = data;
  }

  const { data: existingMember } = await supabase.from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversation.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existingMember) {
    const { error } = await supabase.from("conversation_members").insert({ conversation_id: conversation.id, user_id: user.id });
    if (error) return NextResponse.json({ error: "Your group call access could not be prepared." }, { status: 500 });
  }

  return NextResponse.json({ conversationId: conversation.id });
}
