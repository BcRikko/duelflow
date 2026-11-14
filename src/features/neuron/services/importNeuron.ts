import { z } from 'zod';
import { generateId } from '../../../shared/id';
import { isSafeImageUrl } from '../../../shared/url';
import type { Card, ComboDocument, DeckEntry } from '../../combo/model/types';

const neuronCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantity: z.number().int().min(1),
  type: z.string().optional(),
  imageUrl: z
    .string()
    .max(2048)
    .refine(isSafeImageUrl),
  description: z.string().optional(),
});

const neuronDeckSchema = z.object({
  deck: z.object({
    id: z.string(),
    name: z.string(),
    main: z.array(neuronCardSchema),
    ex: z.array(neuronCardSchema),
    side: z.array(neuronCardSchema),
  }),
});

type NeuronDeckData = z.infer<typeof neuronDeckSchema>;

export function parseNeuronDeck(json: unknown): NeuronDeckData {
  return neuronDeckSchema.parse(json);
}

export function convertNeuronToComboDocument(data: NeuronDeckData): ComboDocument {
  const deck = data.deck;

  const catalogMap = new Map<string, Card>();
  const deckEntries: DeckEntry[] = [];

  const addCards = (cards: NeuronDeckData['deck']['main'], section: 'main' | 'extra' | 'side') => {
    for (const card of cards) {
      if (!catalogMap.has(card.id)) {
        catalogMap.set(card.id, {
          id: card.id,
          name: card.name,
          imageUrl: card.imageUrl,
          type: card.type || '',
          description: card.description,
        });
      }

      deckEntries.push({
        cardId: card.id,
        quantity: card.quantity,
        section,
      });
    }
  };

  addCards(deck.main, 'main');
  addCards(deck.ex, 'extra');
  addCards(deck.side, 'side');

  return {
    schemaVersion: 0,
    deck: {
      id: deck.id || generateId('deck_'),
      name: deck.name,
      source: {
        type: 'neuron',
        deckCode: '',
      },
      cards: deckEntries,
    },
    cardCatalog: Array.from(catalogMap.values()),
    routes: [],
  };
}
