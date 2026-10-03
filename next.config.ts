import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }] },
  // Vercel limita el body a 4.5 MB; las imágenes se validan a ≤ 3 MB en el servidor.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default nextConfig;
