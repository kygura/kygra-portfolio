import crypto from "node:crypto";
import { z } from "zod";
import { getWebhookVerificationToken } from "../_lib/env.ts";
import { DuplicatePublishedSlugError, syncPageById } from "../_lib/sync.ts";

const verificationSchema = z.object({
  verification_token: z.string().trim().min(1),
});

const webhookEventSchema = z.object({
  id: z.string().trim().optional(),
  type: z.string().trim().optional(),
  attempt_number: z.number().int().positive().optional(),
  timestamp: z.string().trim().optional(),
  entity: z
    .object({
      id: z.string().trim().optional(),
      type: z.string().trim().optional(),
    })
    .optional(),
});

const supportedEventTypes = new Set([
  "page.created",
  "page.properties_updated",
  "page.content_updated",
  "page.deleted",
  "page.undeleted",
]);

function safeEqual(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  return (
    expectedBuffer.length === actualBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

/**
 * Verify the `X-Notion-Signature` header. Accepts both the bare hex digest and
 * the `sha256=<hex>` prefixed form so we are resilient to header formatting.
 */
function isValidSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) {
    return false;
  }

  const digest = crypto
    .createHmac("sha256", getWebhookVerificationToken())
    .update(rawBody)
    .digest("hex");

  return [digest, `sha256=${digest}`].some((candidate) =>
    safeEqual(candidate, signature),
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Failed to process webhook";
}

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const signature = request.headers.get("x-notion-signature");

  // One-time subscription handshake: Notion posts the verification token with
  // no signature. Echo it (and log it) so the operator can store it as
  // NOTION_WEBHOOK_VERIFICATION_TOKEN.
  const verification = verificationSchema.safeParse(parsedBody);
  if (verification.success && !signature) {
    console.info(
      "Notion webhook verification token received:",
      verification.data.verification_token,
    );
    return Response.json({
      ok: true,
      verification_token: verification.data.verification_token,
    });
  }

  if (!isValidSignature(rawBody, signature)) {
    return Response.json({ error: "Invalid Notion signature" }, { status: 401 });
  }

  const event = webhookEventSchema.safeParse(parsedBody);
  if (!event.success) {
    return Response.json({ error: "Invalid webhook event payload" }, { status: 400 });
  }

  const { id, type, attempt_number: attemptNumber, entity } = event.data;

  if (!type || !supportedEventTypes.has(type)) {
    return Response.json({
      ok: true,
      ignored: true,
      reason: "Unsupported event type",
      eventType: type ?? null,
      eventId: id ?? null,
    });
  }

  const pageId = entity?.id ?? null;
  if (!pageId) {
    return Response.json({
      ok: true,
      ignored: true,
      reason: "Missing page identifier",
      eventType: type,
      eventId: id ?? null,
    });
  }

  try {
    const result = await syncPageById(pageId);
    return Response.json({
      ok: true,
      eventId: id ?? null,
      eventType: type,
      attemptNumber: attemptNumber ?? null,
      ...result,
    });
  } catch (error) {
    if (error instanceof DuplicatePublishedSlugError) {
      return Response.json(
        {
          error: error.message,
          duplicateSlugs: error.duplicateSlugs,
          pageId,
          eventType: type,
        },
        { status: 409 },
      );
    }

    console.error("Failed to process Notion webhook", error);
    return Response.json(
      { error: errorMessage(error), pageId, eventType: type },
      { status: 500 },
    );
  }
}
