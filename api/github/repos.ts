import { getGithubToken, getGithubUser } from "../_lib/env.ts";
import { buildShowcase } from "../_lib/github.ts";

/**
 * The software index: the owner's public repositories ranked by stars and
 * recent activity, each with a live preview where one exists. The CDN holds
 * a response for an hour and serves the stale copy for a day while it
 * refreshes, so GitHub sees a handful of requests no matter the traffic.
 */
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    const showcase = await buildShowcase({ user: getGithubUser(), token: getGithubToken() });
    return Response.json(showcase, {
      headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    console.error("Failed to build the software index", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to load repositories" },
      { status: 502, headers: { "cache-control": "public, s-maxage=60" } },
    );
  }
}
