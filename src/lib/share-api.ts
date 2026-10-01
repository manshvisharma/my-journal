import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";

const sharePayloadSchema = z.object({
  id: z.string().min(8).max(24),
  ownerUid: z.string().min(1).max(80),
  ownerToken: z.string().min(8).max(64),
  entryId: z.string().min(1).max(120),
  title: z.string().max(240),
  bodyHtml: z.string().max(400000),
  snippet: z.string().max(400),
  entryDate: z.number(),
  wordCount: z.number(),
  mood: z.unknown().nullable(),
  location: z.unknown().nullable(),
  songs: z.unknown().optional(),
  includePhotos: z.boolean(),
  active: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
  expiresAt: z.number().nullable(),
  recipientMap: z.record(z.string(), z.string()).optional(),
  allowNamePrompt: z.boolean().optional(),
});

const mediaItemSchema = z.object({
  id: z.string(),
  shareId: z.string(),
  index: z.number(),
  full: z.string().max(900000),
  thumb: z.string().max(250000),
  w: z.number(),
  h: z.number(),
  createdAt: z.number(),
});

type ShareRow = {
  id: string;
  owner_uid: string;
  entry_id: string;
  owner_token: string;
  payload: unknown;
  media: unknown;
  active: boolean;
  views_total: number;
  visitors: unknown;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
};

function asObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return {};
}

function publicShare(row: ShareRow) {
  const payload = asObject(row.payload);
  delete payload.ownerToken;
  return {
    ...payload,
    id: row.id,
    ownerUid: row.owner_uid,
    entryId: row.entry_id,
    active: row.active,
    viewsTotal: Number(row.views_total) || 0,
    visitors: Array.isArray(row.visitors) ? row.visitors : [],
    media: Array.isArray(row.media) ? row.media : typeof row.media === "string" ? JSON.parse(row.media) : [],
    expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : null,
  };
}

export const upsertPublicShare = createServerFn({ method: "POST" })
  .validator(
    z.object({
      share: sharePayloadSchema,
      media: z.array(mediaItemSchema).max(12),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const { share, media } = data;
    const expiresAt = share.expiresAt ? new Date(share.expiresAt).toISOString() : null;
    const payload = { ...share };
    await sql`
      insert into public_shares (id, owner_uid, entry_id, owner_token, payload, media, active, views_total, created_at, updated_at, expires_at)
      values (
        ${share.id},
        ${share.ownerUid},
        ${share.entryId},
        ${share.ownerToken},
        ${JSON.stringify(payload)}::jsonb,
        ${JSON.stringify(media)}::jsonb,
        ${share.active},
        0,
        to_timestamp(${share.createdAt / 1000}),
        to_timestamp(${share.updatedAt / 1000}),
        ${expiresAt}
      )
      on conflict (id) do update set
        payload = excluded.payload,
        media = excluded.media,
        active = excluded.active,
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at
      where public_shares.owner_token = excluded.owner_token
    `;
    return { ok: true, id: share.id };
  });

export const getPublicShare = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().min(8).max(24) }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<ShareRow>`
      select id, owner_uid, entry_id, owner_token, payload, media, active, views_total, visitors, created_at::text, updated_at::text, expires_at::text
      from public_shares
      where id = ${data.id}
      limit 1
    `;
    const row = rows[0];
    if (!row) return null;
    return publicShare(row);
  });

export const getShareByEntryId = createServerFn({ method: "GET" })
  .validator(z.object({ entryId: z.string().min(1).max(120) }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<ShareRow>`
      select id, owner_uid, entry_id, owner_token, payload, media, active, views_total, visitors, created_at::text, updated_at::text, expires_at::text
      from public_shares
      where entry_id = ${data.entryId}
      order by updated_at desc
      limit 1
    `;
    const row = rows[0];
    if (!row) return null;
    return publicShare(row);
  });

export const setShareActive = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(8).max(24),
      ownerToken: z.string().min(8).max(64),
      active: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`
      update public_shares
      set active = ${data.active}, updated_at = now()
      where id = ${data.id} and owner_token = ${data.ownerToken}
    `;
    return { ok: true };
  });

export const recordShareView = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().min(8).max(24),
      visitor: z
        .object({
          visitorId: z.string().max(80),
          device: z.string().max(40).optional(),
          seconds: z.number().optional(),
          label: z.string().max(80).nullable().optional(),
        })
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<ShareRow>`
      select visitors, views_total from public_shares where id = ${data.id} and active = true limit 1
    `;
    const row = rows[0];
    if (!row) return { ok: false };
    const visitors = Array.isArray(row.visitors)
      ? (row.visitors as Array<Record<string, unknown>>)
      : typeof row.visitors === "string"
        ? (JSON.parse(row.visitors) as Array<Record<string, unknown>>)
        : [];
    if (data.visitor) {
      const existing = visitors.find((v) => v.visitorId === data.visitor?.visitorId);
      if (existing) {
        existing.opens = Number(existing.opens || 0) + 1;
        existing.lastOpenedAt = Date.now();
        existing.totalSeconds = Number(existing.totalSeconds || 0) + Number(data.visitor.seconds || 0);
        if (data.visitor.label) existing.label = data.visitor.label;
      } else {
        visitors.push({
          visitorId: data.visitor.visitorId,
          opens: 1,
          totalSeconds: Number(data.visitor.seconds || 0),
          firstOpenedAt: Date.now(),
          lastOpenedAt: Date.now(),
          device: data.visitor.device || "unknown",
          label: data.visitor.label || null,
        });
      }
    }
    await sql`
      update public_shares
      set views_total = views_total + 1,
          visitors = ${JSON.stringify(visitors)}::jsonb,
          updated_at = now()
      where id = ${data.id}
    `;
    return { ok: true, viewsTotal: Number(row.views_total || 0) + 1 };
  });

export const listOwnerShares = createServerFn({ method: "GET" })
  .validator(z.object({ ownerUid: z.string().min(1).max(80) }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<ShareRow>`
      select id, owner_uid, entry_id, owner_token, payload, media, active, views_total, visitors, created_at::text, updated_at::text, expires_at::text
      from public_shares
      where owner_uid = ${data.ownerUid}
      order by updated_at desc
      limit 80
    `;
    return rows.map(publicShare);
  });

export const deletePublicShare = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(8).max(24), ownerToken: z.string().min(8).max(64) }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`delete from public_shares where id = ${data.id} and owner_token = ${data.ownerToken}`;
    return { ok: true };
  });
