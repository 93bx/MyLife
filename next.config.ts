import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { LEGACY_REDIRECTS } from "./src/lib/nav/config";

const nextConfig: NextConfig = {
  // Worktree sits under the main repo; pin tracing root so Next does not pick the parent lockfile.
  outputFileTracingRoot: path.join(path.dirname(fileURLToPath(import.meta.url))),
  async redirects() {
    return LEGACY_REDIRECTS;
  },
};

export default nextConfig;
