/**
 * Environment access for the build-time Notion sync. Getters for required
 * values throw a named error so misconfiguration fails the build loudly.
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

/** Notion integration token, or `null` when the sync should be skipped. */
export function getOptionalNotionToken(): string | null {
  return firstConfigured(["NOTION_SECRET"]);
}

/** Notion integration token. */
export function getNotionToken(): string {
  const token = getOptionalNotionToken();
  if (!token) {
    throw new Error("Environment variable NOTION_SECRET is not configured");
  }
  return token;
}

/** Explicit data-source ID, if configured (v5 query API needs this). */
export function getConfiguredDataSourceId(): string | null {
  return firstConfigured(["NOTION_DATA_SOURCE_ID"]);
}

/** Database ID, used to derive the data-source ID when not set explicitly. */
export function getConfiguredDatabaseId(): string | null {
  return firstConfigured(["NOTION_DATABASE_ID"]);
}
