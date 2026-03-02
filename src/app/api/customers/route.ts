import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    await requireSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || "";
  const tags = searchParams.getAll("tags");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 10));

  const where: Prisma.CustomerWhereInput = {};

  if (search.trim()) {
    where.name = { contains: search.trim(), mode: "insensitive" };
  }

  if (tags.length > 0) {
    where.interestTags = { hasSome: tags };
  }

  const skip = (page - 1) * pageSize;

  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.customer.count({ where }),
  ]);

  return NextResponse.json({
    customers,
    total,
    totalPages: Math.ceil(total / pageSize),
    page,
  });
}
