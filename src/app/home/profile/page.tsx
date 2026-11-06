import { CommunityNavigation } from "@/components/community-navigation";
import { RoyaltyCopyright } from "@/components/royalty-copyright";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProfile, replaceProfileImage, removeProfileImage } from "../profile-actions";
import { ContentMoreMenu } from "@/components/content-more-menu";

type Profile = {
  id: string;
  display_name: string;
  bio: string;
  avatar_path: string | null;
  cover_path: string | null;
  visibility: "public" | "members" | "friends" | "private";
  location: string;
  initials: string;
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; removed?: string; cleanup?: string; image?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("id,display_name,bio,avatar_path,cover_path,visibility,location,initials")
    .eq("id", user.id)
    .maybeSingle();

  const profile = data as Profile | null;
  const profileName = profile?.display_name || String(user.user_metadata?.display_name || user.email?.split("@")[0] || "Member");
  const profileInitials = profileName.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0] || "").join("").toUpperCase() || "M";
  let avatarUrl: string | null = null;
  let coverUrl: string | null = null;
  if (profile?.avatar_path) {
    const { data: signed } = await supabase.storage
      .from("community-photos")
      .createSignedUrl(profile.avatar_path, 60 * 60);
    avatarUrl = signed?.signedUrl ?? null;
  }
  if (profile?.cover_path) {
    const { data: signed } = await supabase.storage
      .from("community-photos")
      .createSignedUrl(profile.cover_path, 60 * 60);
    coverUrl = signed?.signedUrl ?? null;
  }

  return (
    <main className="app-layout">
      <CommunityNavigation active="profile" />
      <section className="app-main">
        <header className="topbar"><Link href="/home" className="back-link">← Community home</Link><span className="muted">ACCOUNT PROFILE</span></header>
        <div className="app-content">
          <section className="welcome profile-welcome">
            <span className="eyebrow">Your identity</span>
            <h1>Make your profile yours.</h1>
            <p>Keep your details current and choose how other members can discover your profile.</p>
          </section>
          {params.saved && <div className="notice" role="status">Your profile has been saved.</div>}
          {params.removed && <div className="notice" role="status">Your selected profile image has been removed.</div>}
          {params.image && <div className="notice" role="status">Your {params.image === "cover" ? "cover" : "profile"} photo has been saved.</div>}
          {params.cleanup && <div className="notice" role="alert">Your profile was updated, but an old image could not be cleared from storage. Please contact support.</div>}
          {params.error && <div className="notice" role="alert">{params.error}</div>}
          {!profile && <div className="notice" role="alert">Your member profile is still being created. Please refresh this page in a moment.</div>}
          <section className="profile-editor">
            <div className="profile-cover-preview">
              {coverUrl ? <img src={coverUrl} alt="Your profile cover" className="profile-cover-image" /> : <div className="profile-cover-placeholder"><span>Your cover photo</span><small>Add a wide image that represents you</small></div>}
              <ContentMoreMenu fields={{ image_kind: "cover" }} replacePhoto={{ action: replaceProfileImage, label: coverUrl ? "Replace cover photo" : "Add cover photo" }} removePhoto={coverUrl ? { action: removeProfileImage, label: "Remove cover photo" } : undefined} />
            </div>
            <div className="profile-preview">
              {avatarUrl ? <img src={avatarUrl} alt="Your profile" className="profile-avatar-image" /> : <div className="profile-avatar-fallback">{profileInitials}</div>}
              <div><strong>{profileName}</strong><span>Your TIZIBANE community profile</span></div>
              <ContentMoreMenu fields={{ image_kind: "avatar" }} replacePhoto={{ action: replaceProfileImage, label: avatarUrl ? "Replace profile photo" : "Add profile photo" }} removePhoto={avatarUrl ? { action: removeProfileImage, label: "Remove profile photo" } : undefined} />
            </div>
            <form action={updateProfile} className="profile-form">
              <div className="field"><label htmlFor="display_name">Display name</label><input id="display_name" name="display_name" defaultValue={profile?.display_name || String(user.user_metadata?.display_name || "")} maxLength={80} required /></div>
              <div className="field"><label htmlFor="bio">About you</label><textarea id="bio" name="bio" defaultValue={profile?.bio || ""} maxLength={240} rows={4} placeholder="A few words about you..." /></div>
              <div className="field"><label htmlFor="location">Location (optional)</label><input id="location" name="location" defaultValue={profile?.location || ""} maxLength={120} placeholder="City or region" /></div>
              <div className="field"><label htmlFor="visibility">Who can discover your profile?</label><select id="visibility" name="visibility" defaultValue={profile?.visibility || "public"}><option value="public">Public to signed-in members</option><option value="members">All registered members</option><option value="friends">Accepted friends</option><option value="private">Only me</option></select></div>
              <p className="field-help">Use the More menu beside each image to add, replace or remove it. Photos are optimized toward 1 MB, with a 2 MB maximum.</p>
              <div className="profile-form-actions"><Link href="/home" className="btn">Cancel</Link><button className="btn btn-primary" type="submit">Save profile</button></div>
            </form>
          </section>
        <RoyaltyCopyright /></div>
      </section>
    </main>
  );
}
