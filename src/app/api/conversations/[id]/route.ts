import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";

// GET /api/conversations/[id] — get a conversation with its messages
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const conversation = await db.chatConversation.findFirst({
    where: { id, userId: session.user.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true, createdAt: true },
      },
    },
  });

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  return Response.json(conversation);
}

// PATCH /api/conversations/[id] — rename
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const title = body?.title?.trim();

  if (!title || title.length > 100) {
    return Response.json({ error: "Title is required (max 100 chars)" }, { status: 400 });
  }

  const conversation = await db.chatConversation.updateMany({
    where: { id, userId: session.user.id },
    data: { title },
  });

  if (conversation.count === 0) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  return Response.json({ id, title });
}

// DELETE /api/conversations/[id] — delete conversation and all messages
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let session;
  try {
    session = await requireSession();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const result = await db.chatConversation.deleteMany({
    where: { id, userId: session.user.id },
  });

  if (result.count === 0) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  return Response.json({ success: true });
}
