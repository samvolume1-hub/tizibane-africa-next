import { CommunityNavigation } from "@/components/community-navigation";
import { CompressedImageForm } from "@/components/compressed-image-form";
import { ContentMoreMenu } from "@/components/content-more-menu";
import { RoyaltyCopyright } from "@/components/royalty-copyright";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createStory, updateStory, deleteStory, replaceStoryPhoto, removeStoryPhoto } from "./actions";

type Story = { id: string; author_id: string; caption: string; photo_path: string | null; visibility: string; created_at: string; expires_at: string };
type Profile = { id: string; display_name: string; initials: string; avatar_color: string };

export default async function StoriesPage({ searchParams }: { searchParams: Promise<{ error?: string; created?: string; updated?: string; deleted?: string; cleanup?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows, error } = await supabase.from("stories").select("id,author_id,caption,photo_path,visibility,created_at,expires_at").gt("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(60);
  const stories = (rows ?? []) as Story[];
  const authorIds = [...new Set(stories.map((story) => story.author_id))];
  let profiles: Profile[] = [];
  if (authorIds.length) {
    const { data } = await supabase.from("profiles").select("id,display_name,initials,avatar_color").in("id", authorIds);
    profiles = (data ?? []) as Profile[];
  }
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const photoUrls: Record<string, string> = {};
  await Promise.all(stories.filter((story) => story.photo_path).map(async (story) => {
    const { data } = await supabase.storage.from("community-photos").createSignedUrl(story.photo_path!, 3600);
    if (data?.signedUrl) photoUrls[story.id] = data.signedUrl;
  }));

  return (
    <main className="app-layout">
      <CommunityNavigation active="stories" />
      <section className="app-main">
        <header className="topbar"><Link href="/home" className="back-link">← Community home</Link><span className="muted">COMMUNITY STORIES</span></header>
        <div className="app-content community-stories-page">
          <section className="welcome"><span className="eyebrow">A moment from your world</span><h1>Stories</h1><p>Share a photo or a short update. Stories expire automatically after 24 hours.</p></section>
          {params.updated && <div className="notice" role="status">Your story has been updated.</div>}
          {params.deleted && <div className="notice" role="status">Your story has been deleted from TIZIBANE.</div>}
          {params.cleanup && <div className="notice" role="alert">Your story change was saved, but an old photo could not be cleared from storage. Please contact support.</div>}
          <section className="composer story-composer">
            <span className="eyebrow">CREATE A STORY</span>
            <CompressedImageForm action={createStory} className="story-create-form">
              <label className="sr-only" htmlFor="story-caption">Story caption</label>
              <textarea id="story-caption" name="caption" maxLength={500} rows={3} placeholder="What would you like people to know?"/>
              <div className="composer-bottom">
                <div className="composer-options">
                  <label className="photo-picker" htmlFor="story-photo">＋ Add photo</label>
                  <input id="story-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp"/>
                  <select name="visibility" aria-label="Story audience" defaultValue="friends"><option value="public">Everyone</option><option value="friends">My friends</option><option value="private">Only me</option></select>
                </div>
                <button className="btn btn-primary" type="submit">Share story</button>
              </div>
              <p className="field-help">JPG, PNG or WebP · optimized toward 1 MB · maximum 2 MB. Stories are text and photo only and expire after 24 hours.</p>
            </CompressedImageForm>
          </section>
          {params.created && <div className="notice" role="status">Your story has been saved and published.</div>}
          {params.error && <div className="notice" role="alert">{params.error}</div>}
          <div className="feed-heading"><div><span className="eyebrow">RECENT MOMENTS</span><h2>Stories from the community</h2></div><span className="muted">{stories.length} active stories</span></div>
          {error ? <div className="module"><h3>Stories are temporarily unavailable</h3><p>Please refresh in a moment.</p></div> : stories.length === 0 ? <div className="empty-state"><h3>No active stories yet.</h3><p>Share the first moment with your community.</p></div> : (
            <div className="story-list">
              {stories.map((story) => {
                const author = profileById.get(story.author_id);
                const own = story.author_id === user.id;
                return <article className="story-card" key={story.id}>
                  <div className="story-card-heading"><div className="story-author"><span className="avatar" style={{ background: author?.avatar_color || "#8053ad" }}>{author?.initials || "M"}</span><span><strong>{own ? "Your story" : author?.display_name || "TIZIBANE member"}</strong><small>{new Date(story.created_at).toLocaleString("en-ZM",{dateStyle:"medium",timeStyle:"short"})} · {story.visibility}</small></span></div>
                    {own && <ContentMoreMenu fields={{story_id:story.id}} edit={{action:updateStory,value:story.caption,label:"Edit story",fieldName:"caption",maxLength:500,rows:3,select:{label:"Who can see this story?",value:story.visibility,options:[{value:"public",label:"Everyone"},{value:"friends",label:"My friends"},{value:"private",label:"Only me"}]}}} replacePhoto={{action:replaceStoryPhoto,label:story.photo_path?"Replace photo":"Add photo"}} removePhoto={story.photo_path?{action:removeStoryPhoto}:undefined} deleteAction={deleteStory} deleteLabel="Delete story"/>}
                  </div>
                  {photoUrls[story.id] && <img className="story-photo" src={photoUrls[story.id]} alt="Story shared with the community" loading="lazy" decoding="async"/>}
                  {story.caption && <p className="story-caption">{story.caption}</p>}
                  <small className="story-expiry">Expires {new Date(story.expires_at).toLocaleString("en-ZM",{dateStyle:"medium",timeStyle:"short"})}</small>
                </article>;
              })}
            </div>
          )}
          <RoyaltyCopyright />
        </div>
      </section>
    </main>
  );
}
