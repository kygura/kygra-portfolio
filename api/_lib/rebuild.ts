import { getDeployHookUrl } from "./env.ts";

export type RebuildResult =
  | { triggered: true; job: unknown }
  | { triggered: false; reason: string };

/**
 * Ask Vercel to rebuild the site. The build re-reads every published post
 * from Notion, so one trigger reconciles any number of edits, and a missed
 * trigger is repaired by the next one.
 */
export async function triggerRebuild(): Promise<RebuildResult> {
  const hookUrl = getDeployHookUrl();
  if (!hookUrl) {
    return { triggered: false, reason: "VERCEL_DEPLOY_HOOK_URL is not configured" };
  }

  const response = await fetch(hookUrl, { method: "POST" });
  if (!response.ok) {
    throw new Error(`Deploy hook responded with ${response.status}`);
  }

  const body = await response.json().catch(() => null);
  return { triggered: true, job: (body as { job?: unknown } | null)?.job ?? null };
}
