import { getSyncTriggerSecret } from "../_lib/env.ts";
import { DuplicatePublishedSlugError, fullSync } from "../_lib/sync.ts";

function isAuthorized(request: Request): boolean {
  return request.headers.get("authorization") === `Bearer ${getSyncTriggerSecret()}`;
}

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await fullSync();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof DuplicatePublishedSlugError) {
      return Response.json(
        { error: error.message, duplicateSlugs: error.duplicateSlugs },
        { status: 409 },
      );
    }

    console.error("Failed to run full Notion sync", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to run full sync" },
      { status: 500 },
    );
  }
}
