"use server";

import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { customerSchema } from "@/schemas/customer";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";

export async function getCustomers(params: {
  search?: string;
  tags?: string[];
  page?: number;
  pageSize?: number;
}) {
  await requireSession();

  const { search, tags, page = 1, pageSize = 10 } = params;
  const skip = (page - 1) * pageSize;

  const where: Prisma.CustomerWhereInput = {};

  if (search?.trim()) {
    where.name = { contains: search.trim(), mode: "insensitive" };
  }

  if (tags && tags.length > 0) {
    where.interestTags = { hasSome: tags };
  }

  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.customer.count({ where }),
  ]);

  return {
    customers,
    total,
    totalPages: Math.ceil(total / pageSize),
    page,
  };
}

export async function createCustomer(data: unknown) {
  await requireSession();

  const parsed = customerSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const customer = await db.customer.create({ data: parsed.data });
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { success: true, customer };
}

export async function updateCustomer(id: string, data: unknown) {
  await requireSession();

  const parsed = customerSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const existing = await db.customer.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "Pelanggan tidak ditemukan" };
  }

  const customer = await db.customer.update({
    where: { id },
    data: parsed.data,
  });

  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { success: true, customer };
}

export async function deleteCustomer(id: string) {
  await requireSession();

  const existing = await db.customer.findUnique({ where: { id } });
  if (!existing) {
    return { success: false, error: "Pelanggan tidak ditemukan" };
  }

  await db.customer.delete({ where: { id } });
  revalidatePath("/customers");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getCustomerById(id: string) {
  await requireSession();
  return db.customer.findUnique({ where: { id } });
}

export async function getAllTags() {
  await requireSession();

  const customers = await db.customer.findMany({
    select: { interestTags: true },
  });

  const tagCounts: Record<string, number> = {};
  for (const c of customers) {
    for (const tag of c.interestTags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  return Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([tag, count]) => ({ tag, count }));
}
