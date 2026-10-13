import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Mock phase: no image optimizer on Workers yet; photos are pre-sized in /public.
  images: { unoptimized: true },
  async redirects() {
    return [{ source: '/:path*', has: [{ type: 'host', value: 'www.yeral.app' }], destination: 'https://yeral.app/:path*', permanent: true }]
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
export default withNextIntl(nextConfig);

initOpenNextCloudflareForDev();
