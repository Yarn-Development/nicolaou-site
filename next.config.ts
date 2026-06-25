import type { NextConfig } from "next";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
const convexHost = convexUrl ? new URL(convexUrl).hostname : "";

const nextConfig: NextConfig = {
  images: {
    // Question diagrams are SVG/data-URIs and arbitrary Convex storage URLs that
    // next/image can't reliably serve — those render via plain <img>. Remaining
    // next/image usages (avatars etc.) may load from Convex file storage.
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    remotePatterns: [
      ...(convexHost
        ? [{ protocol: "https" as const, hostname: convexHost, pathname: "/**" }]
        : []),
      { protocol: "https" as const, hostname: "*.convex.cloud", pathname: "/**" },
    ],
  },
};

export default nextConfig;
