import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["packages/*/src/**/*.test.ts", "apps/*/src/**/*.test.ts"],
    exclude: ["node_modules", ".next", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["packages/*/src/**", "apps/*/src/**"],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.d.ts",
        // DB schema, migrations, seed, client — require DATABASE_URL, not unit-testable
        "packages/db/**",
        // Worker jobs require pg-boss + DB
        "apps/worker/**",
        // Next.js pages, components, server actions — require React/DB/server-only context
        "apps/web/src/app/**",
        "apps/web/src/components/**",
        "apps/web/src/i18n/**",
        "apps/web/src/auth.ts",
        "apps/web/src/middleware.ts",
        // DB-dependent lib files (use @riaya/db or server-only)
        "apps/web/src/lib/session.ts",
        "apps/web/src/lib/db.ts",
        "apps/web/src/lib/booking-shared.ts",
        "apps/web/src/lib/email-service.ts",
        "apps/web/src/lib/verification-service.ts",
        "apps/web/src/lib/booking-events.ts",
        "apps/web/src/lib/review-service.ts",
        "apps/web/src/lib/notification-service.ts",
        "apps/web/src/lib/escrow-service.ts",
        // Booking availability requires a DB Tx — not unit-testable
        "packages/booking/src/availability.ts",
        // Barrel re-exports availability, polluting it with a DB import chain
        "packages/booking/src/index.ts",
        // pgvector search + backfill require Postgres
        "packages/matching/src/search.ts",
        "packages/matching/src/backfill.ts",
        // Barrel re-exports search, polluting it with a DB import chain
        "packages/matching/src/index.ts",
        // Pure type declarations only — no executable runtime code for V8 coverage
        "packages/core/src/types.ts",
      ],
    },
  },
});
