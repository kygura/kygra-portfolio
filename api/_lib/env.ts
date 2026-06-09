/**
 * Centralized environment-variable access for the Notion → blog pipeline.
 * Every getter throws a clear, named error when the variable is missing so
 * misconfiguration surfaces immediately instead of as a downstream null.
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

function required(primary: string, fallbacks: string[] = []): string {
  const value = firstConfigured([primary, ...fallbacks]);
  if (!value) {
    throw new Error(`Environment variable ${primary} is not configured`);
  }
  return value;
}

/** Notion integration token. */
export function getNotionToken(): string {
  return required("NOTION_SECRET");
}

/** Vercel Blob read/write token. */
export function getBlobToken(): string {
  return required("BLOB_READ_WRITE_TOKEN", ["NOTION_SYNC_READ_WRITE_TOKEN"]);
}

/** HMAC key used to verify the `X-Notion-Signature` header. */
export function getWebhookVerificationToken(): string {
  return required("NOTION_WEBHOOK_VERIFICATION_TOKEN", ["WEBHOOK_SECRET"]);
}

/**
 * Non-throwing variant: the verification token if one is configured under any
 * accepted name, else `null`. Used by the webhook so a missing token degrades
 * to a warning rather than a 500.
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

/** Bearer secret guarding the manual full-sync endpoint. */
export function getSyncTriggerSecret(): string {
  return required("NOTION_SYNC_TRIGGER_SECRET");
}

/** Explicit data-source ID, if configured (v5 query API needs this). */
export function getConfiguredDataSourceId(): string | null {
  return firstConfigured(["NOTION_DATA_SOURCE_ID"]);
}

/** Database ID, used to derive the data-source ID when not set explicitly. */
export function getConfiguredDatabaseId(): string | null {
  return firstConfigured(["NOTION_DATABASE_ID"]);
}
