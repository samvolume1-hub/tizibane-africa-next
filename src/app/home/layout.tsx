import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { NotificationBell } from "@/components/notification-bell";
import { PushNotificationOnboarding } from "@/components/push-notification-onboarding";

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  const dismissalCookie = user ? cookieStore.get(`tizibane_push_onboarding_dismissed_${user.id}`)?.value === "1" : false;
  const hasDismissedPushOnboarding = user?.user_metadata?.tizibane_push_onboarding_dismissed === true || dismissalCookie;

  return (
    <>
      <NotificationBell userId={user?.id ?? ""} />
      {user && !hasDismissedPushOnboarding && (
        <PushNotificationOnboarding
          userId={user.id}
          vapidPublicKey={process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY ?? ""}
        />
      )}
      {children}
    </>
  );
}
