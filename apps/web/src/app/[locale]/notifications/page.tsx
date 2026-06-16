import { getSessionUser } from "@/lib/session";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { getMyNotifications, markAllRead } from "./actions";

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  const t = await getTranslations("notifications");
  const items = await getMyNotifications();
  const hasUnread = items.some((n) => n.readAt == null);

  async function markAllReadAction() {
    "use server";
    await markAllRead();
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-semibold text-gray-900">{t("title")}</h1>
        {hasUnread && (
          <form action={markAllReadAction}>
            <button
              type="submit"
              className="text-sm text-[var(--color-terracotta-600)] hover:underline"
            >
              {t("markAllRead")}
            </button>
          </form>
        )}
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-gray-500 shadow-sm">{t("none")}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-2xl p-4 shadow-sm ${
                n.readAt == null ? "bg-[var(--color-cream-50)]" : "bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{n.title}</p>
                  <p className="mt-0.5 text-sm text-gray-600">{n.body}</p>
                </div>
                {n.readAt == null && (
                  <span
                    aria-label={t("unread")}
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-terracotta-500)]"
                  />
                )}
              </div>
              <p className="mt-1 text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
