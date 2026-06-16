"use server";

import { type ActionResult, ok } from "@/lib/action-result";
import { withRoleTx } from "@/lib/db";
import { notifications } from "@riaya/db";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const ALL_ROLES = ["family", "caregiver", "employer", "admin"] as const;

export type AppNotification = {
  id: string;
  type: (typeof notifications.$inferSelect)["type"];
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: Date | null;
  createdAt: Date;
};

/** The signed-in user's notifications, newest first (RLS-scoped to recipient). */
export const getMyNotifications = withRoleTx(
  [...ALL_ROLES],
  async (tx, user): Promise<AppNotification[]> => {
    return tx
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        data: notifications.data,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(100);
  }
);

/** Count of unread notifications for the nav badge. */
export const getUnreadCount = withRoleTx([...ALL_ROLES], async (tx, user): Promise<number> => {
  const [row] = await tx
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  return Number(row?.n ?? 0);
});

/** Mark all of the signed-in user's notifications as read. */
export const markAllRead = withRoleTx([...ALL_ROLES], async (tx, user): Promise<ActionResult> => {
  await tx
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
  revalidatePath("/notifications");
  return ok(undefined);
});

/** Mark a single notification read (RLS ensures it's the caller's own). */
export const markNotificationRead = withRoleTx(
  [...ALL_ROLES],
  async (tx, user, id: string): Promise<ActionResult> => {
    await tx
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
    revalidatePath("/notifications");
    return ok(undefined);
  }
);
