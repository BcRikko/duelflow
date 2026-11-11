import { z } from 'zod';
import { isSafeImageUrl } from '../../../shared/url';

const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const stepCardRoleSchema = z.enum(['source', 'target', 'material', 'result']);

export const stepCardSchema = z.object({
  cardId: z.string(),
  role: stepCardRoleSchema,
});

export const actionStepSchema = z.object({
  id: z.string(),
  type: z.literal('action'),
  actions: z.array(z.string()),
  cardId: z.string(),
  relatedCards: z.array(stepCardSchema),
  description: z.string().optional(),
  position: positionSchema,
});

export const noteStepSchema = z.object({
  id: z.string(),
  type: z.literal('note'),
  description: z.string(),
  position: positionSchema,
});

export const stepSchema = z.union([actionStepSchema, noteStepSchema]);

export const connectionSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
});

export const routeResultSchema = z.object({
  cardIds: z.array(z.string()),
  description: z.string().optional(),
});

export const routeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  startingCardIds: z.array(z.string()),
  steps: z.array(stepSchema),
  connections: z.array(connectionSchema),
  result: routeResultSchema,
});

export const deckSectionSchema = z.enum(['main', 'extra', 'side']);

export const deckEntrySchema = z.object({
  cardId: z.string(),
  quantity: z.number().int().min(1),
  section: deckSectionSchema,
});

export const deckSourceSchema = z.object({
  type: z.literal('neuron'),
  deckCode: z.string(),
});

export const deckSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: deckSourceSchema,
  cards: z.array(deckEntrySchema),
});

export const cardSchema = z.object({
  id: z.string(),
  name: z.string(),
  imageUrl: z
    .string()
    .max(2048)
    .refine(isSafeImageUrl, {
      message: 'imageUrlは空欄、またはhttp/httpsから始まるURLである必要があります',
    }),
  type: z.string(),
});

export const comboDocumentSchema = z.object({
  schemaVersion: z.number(),
  deck: deckSchema,
  cardCatalog: z.array(cardSchema),
  routes: z.array(routeSchema),
});

export const deckRecordSchema = z.object({
  schemaVersion: z.number(),
  deckId: z.string(),
  name: z.string(),
  source: deckSourceSchema,
  cards: z.array(deckEntrySchema),
  routes: z.array(routeSchema),
  currentRouteId: z.string().nullable(),
});

function collectIds<T extends { id: string }>(items: T[]): Set<string> {
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) {
      throw new Error(`重複したIDが存在します: ${item.id}`);
    }
    ids.add(item.id);
  }
  return ids;
}

export function validateComboDocument(doc: unknown): z.infer<typeof comboDocumentSchema> {
  const parsed = comboDocumentSchema.parse(doc);

  const catalogIds = collectIds(parsed.cardCatalog);
  collectIds(parsed.routes); // validate route id uniqueness

  for (const route of parsed.routes) {
    const stepIds = collectIds(route.steps);
    collectIds(route.connections); // validate connection id uniqueness

    // 初動カードの存在確認
    for (const cardId of route.startingCardIds) {
      if (!catalogIds.has(cardId)) {
        throw new Error(`ルート「${route.name}」の初動カード「${cardId}」がカタログに存在しません`);
      }
    }

    // 接続線の参照先確認
    for (const conn of route.connections) {
      if (!stepIds.has(conn.source)) {
        throw new Error(
          `ルート「${route.name}」の接続線「${conn.id}」の接続元ノード「${conn.source}」が存在しません`,
        );
      }
      if (!stepIds.has(conn.target)) {
        throw new Error(
          `ルート「${route.name}」の接続線「${conn.id}」の接続先ノード「${conn.target}」が存在しません`,
        );
      }
    }

    // アクションノードのカード参照確認
    for (const step of route.steps) {
      if (step.type === 'action') {
        if (!catalogIds.has(step.cardId)) {
          throw new Error(
            `ルート「${route.name}」のノード「${step.id}」でカタログに存在しないカード「${step.cardId}」を参照しています`,
          );
        }
        for (const related of step.relatedCards) {
          if (!catalogIds.has(related.cardId)) {
            throw new Error(
              `ルート「${route.name}」のノード「${step.id}」でカタログに存在しない関連カード「${related.cardId}」を参照しています`,
            );
          }
        }
      }
    }

    // 最終盤面のカード参照確認
    for (const cardId of route.result.cardIds) {
      if (!catalogIds.has(cardId)) {
        throw new Error(
          `ルート「${route.name}」の最終盤面でカタログに存在しないカード「${cardId}」を参照しています`,
        );
      }
    }
  }

  return parsed;
}

export function validateDeckRecord(value: unknown): z.infer<typeof deckRecordSchema> {
  const parsed = deckRecordSchema.parse(value);

  collectIds(parsed.routes); // validate route id uniqueness

  for (const route of parsed.routes) {
    const stepIds = collectIds(route.steps);
    collectIds(route.connections); // validate connection id uniqueness

    for (const conn of route.connections) {
      if (!stepIds.has(conn.source)) {
        throw new Error(
          `ルート「${route.name}」の接続線「${conn.id}」の接続元ノード「${conn.source}」が存在しません`,
        );
      }
      if (!stepIds.has(conn.target)) {
        throw new Error(
          `ルート「${route.name}」の接続線「${conn.id}」の接続先ノード「${conn.target}」が存在しません`,
        );
      }
    }
  }

  return parsed;
}
