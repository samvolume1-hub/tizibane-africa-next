import { redirect } from "next/navigation";

export default async function LegacyConversationRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    redirect("/home/messages");
  }
  // Keep old conversation URLs working, but render every conversation in the
  // single canonical split-pane messaging workspace.
  redirect("/home/messages?conversation=" + encodeURIComponent(id));
}
