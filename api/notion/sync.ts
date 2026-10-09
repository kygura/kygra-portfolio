import { getRebuildSecrets } from "../_lib/env.ts";
import { triggerRebuild } from "../_lib/rebuild.ts";

/**
 * Manual and scheduled rebuilds. Accepts `Authorization: Bearer <secret>` with
 * either NOTION_SYNC_TRIGGER_SECRET (manual POST) or CRON_SECRET (Vercel Cron
 * sends a GET with that header). The daily cron is a safety net for webhook
 * deliveries Notion drops.
 */
function isAuthorized(request: Request): boolean {
  const header = request.headers.get("authorization");
  return getRebuildSecrets().some((secret) => header === `Bearer ${secret}`);
}

async function handle(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await triggerRebuild();
    if (!result.triggered) {
      return Response.json({ error: result.reason }, { status: 500 });
    }
    return Response.json({ ok: true, rebuild: "queued", job: result.job }, { status: 202 });
  } catch (error) {
    console.error("Failed to trigger rebuild", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to trigger rebuild" },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
export const GET = handle;
export const POST = handle;
