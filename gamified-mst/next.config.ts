import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',      // Required for GitHub Pages
  trailingSlash: true,   // Changes /task to /task/index.html so links don't break
};

export default nextConfig;
