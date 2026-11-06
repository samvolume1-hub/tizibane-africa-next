import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CommunityNavigation } from "@/components/community-navigation";
import { RoyaltyCopyright } from "@/components/royalty-copyright";
import { createAnnouncement, editAnnouncement, updateAnnouncementStatus, toggleAnnouncementPin, deleteAnnouncement } from "../announcement-actions";

type Announcement = { id: string; title: string; body: string; status: string; is_pinned: boolean; expires_at: string | null; created_at: string; published_at: string | null };
export default async function ManageAnnouncements({ searchParams }: { searchParams: Promise<{ error?: string; created?: string; updated?: string; deleted?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: adminFlag } = await supabase.rpc("is_current_platform_admin");
  if (adminFlag !== true) redirect("/home/announcements?error=admin");
  const { data } = await supabase.from("community_announcements").select("id,title,body,status,is_pinned,expires_at,created_at,published_at").order("created_at", { ascending: false });
  const announcements = (data ?? []) as Announcement[];
  return <main className="app-layout"><CommunityNavigation active="announcements"/><section className="app-main">
    <header className="topbar"><Link href="/home/announcements" className="back-link">← Official announcements</Link><span className="muted">ADMINISTRATION</span></header>
    <div className="app-content community-feature-page">
      <section className="welcome"><span className="eyebrow">AUTHORISED ADMINISTRATORS</span><h1>Manage announcements</h1><p>Create a draft, publish a verified update, pin an important notice or archive an old one.</p></section>
      {params.created && <div className="notice" role="status">Announcement saved successfully.</div>}
      {params.updated && <div className="notice" role="status">Announcement updated.</div>}
      {params.deleted && <div className="notice" role="status">Announcement deleted.</div>}
      {params.error && <div className="notice" role="alert">{params.error === "length" ? "Check the title and message length." : "We could not complete that action. Please try again."}</div>}
      <section className="feature-admin-form-card"><h2>Write an official update</h2><form action={createAnnouncement} className="feature-admin-form">
        <label htmlFor="announcement-title">Announcement title</label><input id="announcement-title" name="title" minLength={3} maxLength={140} required placeholder="A clear, helpful headline"/>
        <label htmlFor="announcement-body">Message</label><textarea id="announcement-body" name="body" minLength={3} maxLength={8000} rows={6} required placeholder="Write the official update for the TIZIBANE community…"/>
        <div className="feature-admin-form-row"><div><label htmlFor="announcement-status">Publishing status</label><select id="announcement-status" name="status"><option value="draft">Save as draft</option><option value="published">Publish now</option></select></div><div><label htmlFor="announcement-expiry">Optional expiry</label><input id="announcement-expiry" name="expires_at" type="datetime-local"/></div></div>
        <label className="feature-pin-check"><input type="checkbox" name="is_pinned"/> Pin this notice at the top</label>
        <button className="btn btn-primary" type="submit">Save announcement</button>
      </form></section>
      <section className="feature-admin-list"><div className="feed-heading"><div><span className="eyebrow">CONTENT CONTROL</span><h2>All announcements</h2></div><span className="muted">{announcements.length} total</span></div>
        {announcements.length ? announcements.map((item) => <article className="feature-admin-item" key={item.id}><div className="feature-admin-item-copy"><span className={"feature-status status-" + item.status}>{item.status}</span>{item.is_pinned && <span className="home-pinned-label">PINNED</span>}<h3>{item.title}</h3><p>{item.body.length > 180 ? item.body.slice(0,180) + "…" : item.body}</p></div><div className="feature-admin-item-actions">
          {item.status !== "published" ? <form action={updateAnnouncementStatus}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="status" value="published"/><button className="btn btn-primary" type="submit">Publish</button></form> : <form action={updateAnnouncementStatus}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="status" value="archived"/><button className="feature-secondary-button" type="submit">Archive</button></form>}
          <form action={toggleAnnouncementPin}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="pinned" value={String(item.is_pinned)}/><button className="feature-secondary-button" type="submit">{item.is_pinned ? "Unpin" : "Pin"}</button></form>
          <form action={deleteAnnouncement}><input type="hidden" name="id" value={item.id}/><button className="feature-danger-button" type="submit">Delete</button></form>
          <details className="feature-admin-edit">
            <summary>Edit announcement text</summary>
            <form action={editAnnouncement} className="feature-admin-form">
              <input type="hidden" name="id" value={item.id}/>
              <label htmlFor={"edit-title-" + item.id}>Title</label><input id={"edit-title-" + item.id} name="title" minLength={3} maxLength={140} required defaultValue={item.title}/>
              <label htmlFor={"edit-body-" + item.id}>Message</label><textarea id={"edit-body-" + item.id} name="body" minLength={3} maxLength={8000} rows={5} required defaultValue={item.body}/>
              <button className="btn btn-primary" type="submit">Save changes</button>
            </form>
          </details>
        </div></article>) : <p className="home-empty-preview">Your drafts and published notices will appear here.</p>}
      </section>
      <RoyaltyCopyright/>
    </div>
  </section></main>;
}
