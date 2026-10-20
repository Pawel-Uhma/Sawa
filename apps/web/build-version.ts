import { execSync } from "node:child_process";
import { calver } from "./src/lib/app-version";

/** Git, or nothing when it is not there (a container without .git, a zip). */
function git(args: string): string {
  try {
    return execSync(`git ${args}`, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

/**
 * The version baked into the web build: the commit's Warsaw date and time (`calver`), the same
 * name CI gives the release tag. Vercel clones the repo shallow, but the last commit is there.
 */
export function buildVersion(env: NodeJS.ProcessEnv = process.env) {
  const sha = env.VERCEL_GIT_COMMIT_SHA || git("rev-parse HEAD");
  const date = git("log -1 --format=%cI");
  return {
    version: date ? calver(new Date(date)) : "dev",
    commit: sha.slice(0, 7),
  };
}
