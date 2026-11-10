import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CommunityNavigation } from "@/components/community-navigation";
import { RoyaltyCopyright } from "@/components/royalty-copyright";

type Activity = { id: number; actor_id: string | null; event_type: string; target_type: string; target_id: string; created_at: string };
export default async function CommunityActivityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await supabase.from("community_activity").select("id,actor_id,event_type,target_type,target_id,created_at").order("created_at", { ascending: false }).limit(100);
  const activity = (data ?? []) as Activity[];
  const groupIds = [...new Set(activity.filter((a) => a.target_type === "group").map((a) => a.target_id))];
  const eventIds = [...new Set(activity.filter((a) => a.target_type === "event").map((a) => a.target_id))];
  const [groupsResult, eventsResult] = await Promise.all([
    groupIds.length ? supabase.from("groups").select("id,name").in("id", groupIds) : Promise.resolve({data:[] as {id:string;name:string}[]}),
    eventIds.length ? supabase.from("events").select("id,name").in("id", eventIds) : Promise.resolve({data:[] as {id:string;name:string}[]}),
  ]);
  const groupNames = new Map((groupsResult.data ?? []).map((g) => [g.id,g.name]));
  const eventNames = new Map((eventsResult.data ?? []).map((e) => [e.id,e.name]));
  return <main className="app-layout"><CommunityNavigation active="activity"/><section className="app-main">
    <header className="topbar"><Link href="/home" className="back-link">← Community home</Link><span className="muted">COMMUNITY PULSE</span></header>
    <div className="app-content community-feature-page">
      <section className="welcome"><h1 style={{ fontWeight: 800 }}>Community Activity</h1></section>
      {error ? <div className="module"><h3>Activity is temporarily unavailable</h3><p>Please refresh in a moment.</p></div> : activity.length ? <div className="feature-activity-feed">{activity.map((item) => {
        const label = item.event_type === "public_post" ? "shared a public discussion" : item.event_type === "public_comment" ? "joined a public discussion" : item.event_type === "public_reaction" ? "reacted to a public discussion" : item.event_type === "public_group_created" ? "started a public group" : item.event_type === "public_event_created" ? "created a public event" : "responded to a public event";
        const target = item.target_type === "group" ? groupNames.get(item.target_id) : item.target_type === "event" ? eventNames.get(item.target_id) : null;
        const href = item.target_type === "group" ? "/home/groups/" + item.target_id : item.target_type === "event" ? "/home/events" : "/home";
        return <article className="feature-activity-row" key={item.id}><span className="feature-activity-icon" aria-hidden="true">{item.target_type === "group" ? "◈" : item.target_type === "event" ? "◇" : "✦"}</span><div><p><strong>A community member</strong> {label}{target ? <>: <Link href={href}>{target}</Link></> : null}</p><time>{new Date(item.created_at).toLocaleString("en-ZM", { dateStyle: "medium", timeStyle: "short" })}</time></div><Link href={href} className="home-view-all">View ↗</Link></article>;
      })}</div> : <div className="empty-state"><div className="empty-symbol">◷</div><h3>The community is just getting started.</h3><p>Public discussions, groups and events will appear here as members take part.</p></div>}
      <RoyaltyCopyright/>
    </div>
  </section></main>;
}
