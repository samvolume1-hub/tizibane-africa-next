import "./../illustrated-navigation-fix.css";
import { createClient } from "@/lib/supabase/server";
import { NotificationBell } from "@/components/notification-bell";

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <>
      <NotificationBell userId={user?.id ?? ""} />
      {children}
    </>
  );
}
