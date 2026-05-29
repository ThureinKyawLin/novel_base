"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { genreFormSchema, uuidSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { invalidateGenreCaches } from "@/lib/redis";

export async function createGenre(data: { name: string; name_mm: string | null }) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = genreFormSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const genre = await prisma.genre.create({
      data: {
        name: parsed.data.name.trim(),
        nameMm: parsed.data.name_mm?.trim() || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "create",
        entityType: "genre",
        entityId: genre.id,
        details: { name: genre.name },
      },
    });

    await invalidateGenreCaches();
    revalidatePath("/admin/genres");
    return {
      data: {
        id: genre.id,
        name: genre.name,
        name_mm: genre.nameMm,
        created_at: genre.createdAt.toISOString(),
      },
    };
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("Unique")) {
      return { error: "A genre with this name already exists" };
    }
    return { error: "Failed to create genre" };
  }
}

export async function updateGenre(
  id: string,
  data: { name: string; name_mm: string | null }
) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  if (!uuidSchema.safeParse(id).success) return { error: "Invalid ID" };

  const parsed = genreFormSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  try {
    const genre = await prisma.genre.update({
      where: { id },
      data: {
        name: parsed.data.name.trim(),
        nameMm: parsed.data.name_mm?.trim() || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "update",
        entityType: "genre",
        entityId: genre.id,
        details: { name: genre.name },
      },
    });

    await invalidateGenreCaches();
    revalidatePath("/admin/genres");
    return {
      data: {
        id: genre.id,
        name: genre.name,
        name_mm: genre.nameMm,
        created_at: genre.createdAt.toISOString(),
      },
    };
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("Unique")) {
      return { error: "A genre with this name already exists" };
    }
    return { error: "Failed to update genre" };
  }
}

export async function deleteGenre(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  if (!uuidSchema.safeParse(id).success) return { error: "Invalid ID" };

  try {
    const genre = await prisma.genre.findUnique({
      where: { id },
      select: { name: true },
    });

    await prisma.genre.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "delete",
        entityType: "genre",
        entityId: id,
        details: { name: genre?.name },
      },
    });

    await invalidateGenreCaches();
    revalidatePath("/admin/genres");
    return { success: true };
  } catch {
    return { error: "Failed to delete genre" };
  }
}
