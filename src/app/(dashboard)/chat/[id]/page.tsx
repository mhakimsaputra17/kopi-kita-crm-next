import { ChatLayout } from "@/components/chat/chat-layout";

export default async function ChatConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChatLayout conversationId={id} />;
}
