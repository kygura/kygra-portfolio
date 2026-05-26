import {
  APIErrorCode,
  Client,
  isFullPage,
  iteratePaginatedAPI,
  isNotionClientError,
  type PageObjectResponse,
} from "@notionhq/client";
import {
  notionPostMetadataSchema,
  normalizeSlug,
  type NotionPostMetadata,
} from "../../content/posts.ts";
import { getNotionDataSourceId, getNotionToken } from "./posts.ts";

type NotionProperty = PageObjectResponse["properties"][string];

export function getNotionClient() {
  return new Client({
    auth: getNotionToken(),
  });
}

function extractTitle(property?: NotionProperty): string {
  if (!property || property.type !== "title") {
    return "";
  }

  return property.title.map((item) => item.plain_text).join("").trim();
}

function extractRichText(property?: NotionProperty): string {
  if (!property || property.type !== "rich_text") {
    return "";
  }

  return property.rich_text.map((item) => item.plain_text).join("").trim();
}

function extractCheckbox(property?: NotionProperty): boolean {
  return Boolean(property && property.type === "checkbox" ? property.checkbox : false);
}

function extractDate(property?: NotionProperty): string {
  return property && property.type === "date" ? property.date?.start ?? "" : "";
}

function extractCreatedTime(property?: NotionProperty): string {
  return property && property.type === "created_time" ? property.created_time : "";
}

function extractLastEditedTime(property?: NotionProperty): string {
  return property && property.type === "last_edited_time" ? property.last_edited_time : "";
}

function extractMultiSelect(property?: NotionProperty): string[] {
  return property && property.type === "multi_select"
    ? property.multi_select.map((item) => item.name).filter(Boolean)
    : [];
}

export async function listNotionPages(): Promise<PageObjectResponse[]> {
  const notion = getNotionClient();
  const results: PageObjectResponse[] = [];

  for await (const result of iteratePaginatedAPI(notion.dataSources.query, {
    data_source_id: getNotionDataSourceId(),
    in_trash: false,
    page_size: 100,
    result_type: "page",
  })) {
    if (isFullPage(result)) {
      results.push(result);
    }
  }

  return results;
}

export async function retrieveNotionPage(pageId: string): Promise<PageObjectResponse | null> {
  const notion = getNotionClient();

  try {
    const result = await notion.pages.retrieve({
      page_id: pageId,
    });

    return isFullPage(result) ? result : null;
  } catch (error) {
    if (
      isNotionClientError(error) &&
      (error.code === APIErrorCode.ObjectNotFound ||
        error.code === APIErrorCode.Unauthorized ||
        error.code === APIErrorCode.RestrictedResource)
    ) {
      return null;
    }

    throw error;
  }
}

export function isPageInConfiguredDataSource(page: PageObjectResponse): boolean {
  const configuredId = getNotionDataSourceId();
  const normalizedConfiguredId = configuredId.toLowerCase();
  const parent = page.parent;

  if (parent.type === "data_source_id") {
    return parent.data_source_id.toLowerCase() === normalizedConfiguredId;
  }

  if (parent.type === "database_id") {
    return parent.database_id.toLowerCase() === normalizedConfiguredId;
  }

  return false;
}

export function extractNotionPostMetadata(page: PageObjectResponse): NotionPostMetadata {
  const properties = page.properties ?? {};
  const primaryTags = extractMultiSelect(properties.Tags);
  const secondaryTags = extractMultiSelect(properties.tags);
  const title =
    extractTitle(properties.Title) ||
    extractTitle(properties.Name) ||
    extractTitle(properties.title) ||
    page.id;
  const explicitSlug =
    extractRichText(properties.Slug) ||
    extractRichText(properties.slug) ||
    extractTitle(properties.Slug) ||
    extractTitle(properties.slug);
  const excerpt =
    extractRichText(properties.Description) || extractRichText(properties.description) || "";
  const createdTime = page.created_time || extractCreatedTime(properties.Created) || extractCreatedTime(properties.created);
  const lastEditedTime =
    page.last_edited_time ||
    extractLastEditedTime(properties["Last edited time"]) ||
    extractLastEditedTime(properties.lastEditedTime);
  const date =
    extractDate(properties.Date) ||
    extractDate(properties.date) ||
    extractCreatedTime(properties.Created) ||
    extractCreatedTime(properties.created) ||
    createdTime ||
    lastEditedTime;
  const tags = primaryTags.length > 0 ? primaryTags : secondaryTags;
  const published = extractCheckbox(properties.Published) || extractCheckbox(properties.published);

  return notionPostMetadataSchema.parse({
    pageId: page.id,
    title,
    slug: normalizeSlug(explicitSlug || title || page.id),
    excerpt,
    date,
    tags,
    published,
    createdTime,
    lastEditedTime,
  });
}
