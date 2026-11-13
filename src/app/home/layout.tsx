import "./../illustrated-navigation-fix.css";
import { createClient } from "@/lib/supabase/server";
import { NotificationBell } from "@/components/notification-bell";
import { PushNotificationOnboarding } from "@/components/push-notification-onboarding";

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <>
      <NotificationBell userId={user?.id ?? ""} />
      {user && (
        <PushNotificationOnboarding
          userId={user.id}
          vapidPublicKey={process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY ?? ""}
        />
      )}
      {children}
    </>
  );
}
