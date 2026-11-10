/** @type {import('next').NextConfig} */
export default {
  // `npm run build:prod` sets NEXT_DIST_DIR so a measurement build never overwrites the dev server's .next folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
};
