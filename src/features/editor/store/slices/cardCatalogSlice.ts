import type { StateCreator } from 'zustand';
import {
  deleteCard,
  getAllDecks,
  saveCard,
  saveDeck,
  type CardRecord,
  type DeckRecord,
} from '../../../../shared/cardDatabase';
import { generateId } from '../../../../shared/id';
import type { Card, DeckEntry } from '../../../combo/model/types';
import type { CardCatalogActions, CardCatalogState, ComboActions, ComboState } from '../types';

export function cardRecordToCard(record: CardRecord): Card {
  return {
    id: record.cardId,
    name: record.name,
    type: record.type,
    description: record.description,
  };
}

export const createCardCatalogSlice: StateCreator<
  ComboState & ComboActions,
  [],
  [],
  CardCatalogState & CardCatalogActions
> = (set) => ({
  cards: [],

  addCardToCatalog: async (card, imageFile) => {
    const id = generateId('card_');
    await saveCard(id, card.name, card.type, { file: imageFile, description: card.description });

    set((state) => {
      const nextCards = [...state.cards, { ...card, id }];
      const currentDeck = state.currentDeck;
      if (!currentDeck || currentDeck.cards.some((entry) => entry.cardId === id)) {
        return { cards: nextCards };
      }
      const newEntry: DeckEntry = { cardId: id, quantity: 1, section: 'main' };
      return {
        cards: nextCards,
        currentDeck: {
          ...currentDeck,
          cards: [...currentDeck.cards, newEntry],
        },
      };
    });
    return id;
  },

  updateCardInCatalog: async (id, updates, imageFile) => {
    set((state) => {
      const current = state.cards.find((c) => c.id === id);
      if (!current) return {};
      const next = { ...current, ...updates };
      void saveCard(id, next.name, next.type, { file: imageFile, description: next.description });
      return {
        cards: state.cards.map((card) => (card.id === id ? next : card)),
      };
    });
  },

  removeCardFromCatalog: async (id) => {
    await deleteCard(id);

    const deckRecords = await getAllDecks();
    const updatedDecks: DeckRecord[] = [];

    for (const deck of deckRecords) {
      const hasCardInEntries = deck.cards.some((entry) => entry.cardId === id);
      const hasCardInRoute = deck.route.steps.some(
        (step) =>
          step.type === 'action' &&
          (step.cardId === id || step.relatedCards.some((related) => related.cardId === id)),
      );

      if (!hasCardInEntries && !hasCardInRoute) continue;

      const updatedDeck: DeckRecord = {
        ...deck,
        cards: hasCardInEntries ? deck.cards.filter((entry) => entry.cardId !== id) : deck.cards,
        route: hasCardInRoute
          ? {
              ...deck.route,
              steps: deck.route.steps.map((step) => {
                if (step.type !== 'action') return step;
                return {
                  ...step,
                  relatedCards: step.relatedCards.filter((related) => related.cardId !== id),
                };
              }),
            }
          : deck.route,
      };

      await saveDeck(updatedDeck);
      updatedDecks.push(updatedDeck);
    }

    const updatedDeckMap = new Map(updatedDecks.map((deck) => [deck.deckId, deck]));

    set((state) => ({
      cards: state.cards.filter((card) => card.id !== id),
      decks: state.decks.map((deck) => {
        const updated = updatedDeckMap.get(deck.deckId);
        return updated ? { ...deck, name: updated.name } : deck;
      }),
      currentDeck:
        state.currentDeck && updatedDeckMap.has(state.currentDeck.deckId)
          ? updatedDeckMap.get(state.currentDeck.deckId)!
          : state.currentDeck,
    }));
  },
});
