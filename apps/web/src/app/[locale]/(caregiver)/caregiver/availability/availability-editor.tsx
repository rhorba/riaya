"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import type { Slot } from "./actions";
import { saveAvailability } from "./actions";

const DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon→Sun display order

type WeekRow = { day: number; enabled: boolean; startTime: string; endTime: string };
type Override = {
  id: string;
  date: string;
  available: boolean;
  startTime: string;
  endTime: string;
};

function initWeek(slots: Slot[]): WeekRow[] {
  return DAYS.map((d) => {
    const s = slots.find((x) => x.specificDate == null && x.dayOfWeek === d);
    return s
      ? { day: d, enabled: s.available, startTime: s.startTime, endTime: s.endTime }
      : { day: d, enabled: false, startTime: "09:00", endTime: "17:00" };
  });
}

function initOverrides(slots: Slot[]): Override[] {
  return slots
    .filter((s) => s.specificDate != null)
    .map((s) => ({
      id: crypto.randomUUID(),
      date: s.specificDate as string,
      available: s.available,
      startTime: s.startTime,
      endTime: s.endTime,
    }));
}

export function AvailabilityEditor({ initialSlots }: { initialSlots: Slot[] }) {
  const t = useTranslations("availability");
  const [week, setWeek] = useState<WeekRow[]>(() => initWeek(initialSlots));
  const [overrides, setOverrides] = useState<Override[]>(() => initOverrides(initialSlots));
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  function setDay(day: number, patch: Partial<Omit<WeekRow, "day">>) {
    setWeek((w) => w.map((r) => (r.day === day ? { ...r, ...patch } : r)));
    setStatus("idle");
  }

  function addOverride() {
    setOverrides((o) => [
      ...o,
      {
        id: crypto.randomUUID(),
        date: "",
        available: false,
        startTime: "09:00",
        endTime: "17:00",
      },
    ]);
    setStatus("idle");
  }

  function setOverride(id: string, patch: Partial<Override>) {
    setOverrides((o) => o.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    setStatus("idle");
  }

  function removeOverride(id: string) {
    setOverrides((o) => o.filter((x) => x.id !== id));
    setStatus("idle");
  }

  function save() {
    const slots: Array<{
      dayOfWeek: number | null;
      specificDate: string | null;
      startTime: string;
      endTime: string;
      available: boolean;
    }> = [];

    for (const row of week) {
      if (row.enabled && row.endTime > row.startTime) {
        slots.push({
          dayOfWeek: row.day,
          specificDate: null,
          startTime: row.startTime,
          endTime: row.endTime,
          available: true,
        });
      }
    }
    for (const o of overrides) {
      if (!o.date) continue;
      if (o.available && o.endTime <= o.startTime) continue;
      slots.push({
        dayOfWeek: null,
        specificDate: o.date,
        // A "blocked" override still needs a valid time range to satisfy the schema.
        startTime: o.available ? o.startTime : "00:00",
        endTime: o.available ? o.endTime : "23:59",
        available: o.available,
      });
    }

    startTransition(async () => {
      const result = await saveAvailability({ slots });
      setStatus(result.ok ? "saved" : "error");
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-serif text-lg font-semibold text-gray-900">{t("weeklyTitle")}</h2>
        <div className="space-y-2">
          {week.map((row) => (
            <div key={row.day} className="flex flex-wrap items-center gap-3">
              <label className="flex w-32 items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={row.enabled}
                  onChange={(e) => setDay(row.day, { enabled: e.target.checked })}
                />
                {t(`days.${row.day}`)}
              </label>
              <input
                type="time"
                value={row.startTime}
                disabled={!row.enabled}
                onChange={(e) => setDay(row.day, { startTime: e.target.value })}
                className={TIME_CLS}
              />
              <span className="text-gray-400">→</span>
              <input
                type="time"
                value={row.endTime}
                disabled={!row.enabled}
                onChange={(e) => setDay(row.day, { endTime: e.target.value })}
                className={TIME_CLS}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-gray-900">{t("overridesTitle")}</h2>
          <button
            type="button"
            onClick={addOverride}
            className="text-sm font-medium text-[var(--color-terracotta-600)]"
          >
            + {t("addOverride")}
          </button>
        </div>
        <p className="mb-3 text-xs text-gray-400">{t("overridesHint")}</p>
        {overrides.length === 0 ? (
          <p className="text-sm text-gray-400">{t("noOverrides")}</p>
        ) : (
          <div className="space-y-2">
            {overrides.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-3">
                <input
                  type="date"
                  value={o.date}
                  onChange={(e) => setOverride(o.id, { date: e.target.value })}
                  className={TIME_CLS}
                />
                <select
                  value={o.available ? "open" : "blocked"}
                  onChange={(e) => setOverride(o.id, { available: e.target.value === "open" })}
                  className={TIME_CLS}
                >
                  <option value="blocked">{t("blocked")}</option>
                  <option value="open">{t("open")}</option>
                </select>
                {o.available && (
                  <>
                    <input
                      type="time"
                      value={o.startTime}
                      onChange={(e) => setOverride(o.id, { startTime: e.target.value })}
                      className={TIME_CLS}
                    />
                    <span className="text-gray-400">→</span>
                    <input
                      type="time"
                      value={o.endTime}
                      onChange={(e) => setOverride(o.id, { endTime: e.target.value })}
                      className={TIME_CLS}
                    />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => removeOverride(o.id)}
                  className="text-sm text-gray-400 hover:text-red-600"
                >
                  {t("remove")}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded-lg bg-[var(--color-terracotta-500)] px-5 py-2.5 font-medium text-white transition-colors hover:bg-[var(--color-terracotta-600)] disabled:opacity-60"
        >
          {t("save")}
        </button>
        {status === "saved" && (
          <span className="text-sm text-[var(--color-sage-600)]">{t("saved")}</span>
        )}
        {status === "error" && <span className="text-sm text-red-600">{t("saveError")}</span>}
      </div>
    </div>
  );
}

const TIME_CLS =
  "rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[var(--color-terracotta-500)] focus:outline-none disabled:bg-gray-50 disabled:text-gray-400";
