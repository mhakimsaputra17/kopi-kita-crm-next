import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { db } from "@/lib/db";

// GET /api/conversations — list all conversations for the user
export async function GET() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversations = await db.chatConversation.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      updatedAt: true,
    },
  });

  return Response.json(conversations);
}

// POST /api/conversations — create a new (empty) conversation
export async function POST() {
  let session;
  try {
    session = await requireSession();
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversation = await db.chatConversation.create({
    data: {
      userId: session.user.id,
      title: "Chat Baru",
    },
    select: { id: true, title: true, updatedAt: true },
  });

  return Response.json(conversation, { status: 201 });
}
