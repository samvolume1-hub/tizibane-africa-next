import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const categories = new Set(["Music talent", "Music video", "Photography"]);

export async function GET() {
  const supabase = await createClient();
  const [{ data: userResult }, companyResult] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("spotlight_company_reviews")
      .select("id,title,company_name,category,body,source_url,is_pinned,published_at,created_at")
      .eq("status", "published")
      .order("is_pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(12),
  ]);

  if (companyResult.error) {
    return NextResponse.json({ error: "Spotlight reviews are temporarily unavailable." }, { status: 503 });
  }

  let submissions: Array<Record<string, unknown>> = [];
  if (userResult.user) {
    const { data } = await supabase.from("spotlight_submissions")
      .select("id,category,title,public_url,note,status,admin_note,created_at,reviewed_at")
      .eq("user_id", userResult.user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    submissions = data ?? [];
  }

  return NextResponse.json({
    authenticated: Boolean(userResult.user),
    companyReviews: companyResult.data ?? [],
    submissions,
  }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in to submit work for review.", signInRequired: true }, { status: 401 });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "The submission could not be read." }, { status: 400 });
  }

  const category = typeof payload.category === "string" ? payload.category.trim() : "";
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const publicUrl = typeof payload.publicUrl === "string" ? payload.publicUrl.trim() : "";
  const note = typeof payload.note === "string" ? payload.note.trim() : "";

  let parsedUrl: URL;
  try { parsedUrl = new URL(publicUrl); } catch { return NextResponse.json({ error: "Enter a valid public HTTPS link." }, { status: 400 }); }
  if (!categories.has(category) || title.length < 2 || title.length > 140 || parsedUrl.protocol !== "https:" || parsedUrl.username || parsedUrl.password || note.length > 500) {
    return NextResponse.json({ error: "Please check the category, title, public HTTPS link and note." }, { status: 400 });
  }

  const { data, error } = await supabase.from("spotlight_submissions").insert({
    user_id: user.id,
    category,
    title,
    public_url: parsedUrl.toString(),
    note,
    status: "pending",
  }).select("id,category,title,public_url,note,status,admin_note,created_at,reviewed_at").single();

  if (error || !data) return NextResponse.json({ error: "Your submission could not be saved. Please try again." }, { status: 500 });
  return NextResponse.json({ submission: data }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
}
