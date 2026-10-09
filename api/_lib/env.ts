/**
 * Environment access for the rebuild-trigger endpoints. Notion itself is only
 * read at build time (see scripts/build-writings.ts), so the runtime functions
 * need nothing beyond webhook verification and the deploy hook.
 */

function firstConfigured(names: string[]): string | null {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

/**
 * HMAC key used to verify the `X-Notion-Signature` header, if one is configured
 * under any accepted name.
 */
export function getOptionalWebhookVerificationToken(): string | null {
  return firstConfigured(["NOTION_WEBHOOK_VERIFICATION_TOKEN", "WEBHOOK_SECRET"]);
}

/**
 * When `true`, the webhook rejects events whose signature is missing or invalid.
 * Defaults to `false` so an already-registered subscription keeps delivering
 * without re-running the Notion-side setup.
 */
export function isWebhookSignatureRequired(): boolean {
  return process.env.NOTION_WEBHOOK_REQUIRE_SIGNATURE === "true";
}

/** Vercel deploy hook that rebuilds the site (and with it, the writings). */
export function getDeployHookUrl(): string | null {
  return firstConfigured(["VERCEL_DEPLOY_HOOK_URL"]);
}

/** Bearer secrets accepted by the manual / scheduled rebuild endpoint. */
export function getRebuildSecrets(): string[] {
  return ["NOTION_SYNC_TRIGGER_SECRET", "CRON_SECRET"]
    .map((name) => firstConfigured([name]))
    .filter((value): value is string => Boolean(value));
}

/** Notion database / data-source IDs whose page events should trigger a rebuild. */
export function getWatchedNotionParentIds(): string[] {
  return ["NOTION_DATA_SOURCE_ID", "NOTION_DATABASE_ID"]
    .map((name) => firstConfigured([name]))
    .filter((value): value is string => Boolean(value));
}
