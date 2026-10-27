/** @type {import('next').NextConfig} */
export default {
  // A second admin (for the electronics shop) is built into its own folder so it never overwrites the main admin's build.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
};
