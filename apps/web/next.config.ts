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
  experimental: {
    typedRoutes: true,
  },
};

export default withNextIntl(nextConfig);
