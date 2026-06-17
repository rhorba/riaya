import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// CSP is report-only for v0.1: Next.js App Router needs 'unsafe-inline' for
// hydration scripts and Tailwind inlines styles — switching to nonces requires
// middleware-level nonce generation (v0.2 hardening). Report-only gives
// visibility into violations without breaking the app.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  "connect-src 'self'",
  // frame-src 'self' https: — admin doc preview uses a signed R2 URL in an iframe
  "frame-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

const SECURITY_HEADERS = [
  // HSTS — 2 years, include subdomains + preload list
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Clickjacking: allow same-origin framing only
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Limit referrer information to origin only on cross-origin requests
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable unneeded browser features
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  // CSP in report-only mode — does not block, surfaces violations
  { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
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
