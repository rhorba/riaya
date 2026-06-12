import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: [
    "@riaya/core",
    "@riaya/db",
    "@riaya/booking",
    "@riaya/payments",
    "@riaya/matching",
    "@riaya/verification",
    "@riaya/notifications",
  ],
  // typedRoutes is intentionally off: with next-intl localePrefix "always",
  // links use locale-less hrefs (e.g. "/auth/signup") that the middleware
  // prefixes at request time, which typedRoutes cannot statically verify.
  // The codebase uses NodeNext-style `.js` import specifiers on `.ts` sources
  // (works with Turbopack/tsx/Vitest). Teach the webpack production build to
  // resolve `.js` → `.ts`/`.tsx`, falling back to real `.js` in node_modules.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
