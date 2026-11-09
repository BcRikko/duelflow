import type { z } from 'zod';
import {
  actionStepSchema,
  cardSchema,
  comboDocumentSchema,
  connectionSchema,
  deckEntrySchema,
  noteStepSchema,
  routeSchema,
  stepCardRoleSchema,
  stepCardSchema,
  stepSchema,
} from './schema';

export type StepCardRole = z.infer<typeof stepCardRoleSchema>;
export type StepCard = z.infer<typeof stepCardSchema>;
export type ActionStep = z.infer<typeof actionStepSchema>;
export type NoteStep = z.infer<typeof noteStepSchema>;
export type Step = z.infer<typeof stepSchema>;
export type Connection = z.infer<typeof connectionSchema>;
export type Route = z.infer<typeof routeSchema>;
export type DeckEntry = z.infer<typeof deckEntrySchema>;
export type Card = z.infer<typeof cardSchema>;
export type ComboDocument = z.infer<typeof comboDocumentSchema>;
