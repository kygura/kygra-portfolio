import { Client } from "@notionhq/client";
import {
  getConfiguredDatabaseId,
  getConfiguredDataSourceId,
  getNotionToken,
} from "../env.ts";

/** Construct a Notion client authenticated with the integration token. */
export function getNotionClient(): Client {
  return new Client({ auth: getNotionToken() });
}

let cachedDataSourceId: string | null = null;

/**
 * Resolve the data-source ID required by the v5 query API. Prefers the explicit
 * `NOTION_DATA_SOURCE_ID`; otherwise retrieves the configured database and uses
 * its first data source. Result is cached for the process lifetime.
 */
export async function resolveDataSourceId(
  client: Client = getNotionClient(),
): Promise<string> {
  const configured = getConfiguredDataSourceId();
  if (configured) {
    return configured;
  }
  if (cachedDataSourceId) {
    return cachedDataSourceId;
  }

  const databaseId = getConfiguredDatabaseId();
  if (!databaseId) {
    throw new Error(
      "NOTION_DATA_SOURCE_ID or NOTION_DATABASE_ID must be configured",
    );
  }

  const database = (await client.databases.retrieve({
    database_id: databaseId,
  })) as { data_sources?: Array<{ id: string }> };
  const dataSources = database.data_sources ?? [];

  if (dataSources.length === 0) {
    throw new Error(`Notion database ${databaseId} has no data sources`);
  }

  cachedDataSourceId = dataSources[0].id;
  return cachedDataSourceId;
}

/** Reset the cached data-source ID (used by tests). */
export function resetDataSourceCacheForTesting(): void {
  cachedDataSourceId = null;
}
