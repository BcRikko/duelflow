import { create } from 'zustand';
import {
  clearAll,
  getAllCards,
  getAllDecks,
  saveDeck,
} from '../../../shared/cardDatabase';
import { clearUiState, loadUiState, saveUiState } from '../../../shared/uiStorage';
import { createDefaultNodeFormData } from '../model/form';
import { cardRecordToCard, createCardCatalogSlice } from './slices/cardCatalogSlice';
import { createDeckSlice } from './slices/deckSlice';
import {
  createHistorySlice,
  isRecordingHistoryValue,
  isRestoringHistoryValue,
  recordHistory,
  setRestoringHistory,
  skipHistory,
} from './slices/historySlice';
import { createUISlice } from './slices/uiSlice';
import { migrateRouteRoles } from './routeUtils';
import type { ComboActions, ComboState } from './types';

export type { EditorSelection } from './types';

export const useComboStore = create<ComboState & ComboActions>()((set, get, api) => ({
  ...createUISlice(set, get, api),
  ...createCardCatalogSlice(set, get, api),
  ...createDeckSlice(set, get, api),
  ...createHistorySlice(set, get, api),

  initialize: async () => {
    const [cardRecords, deckRecords] = await Promise.all([getAllCards(), getAllDecks()]);
    const uiState = loadUiState();

    const migratedDeckRecords = deckRecords.map((deck) => ({
      ...deck,
      route: migrateRouteRoles(deck.route),
    }));

    const decks = migratedDeckRecords.map((deck) => ({ deckId: deck.deckId, name: deck.name }));
    let currentDeck = null;

    if (uiState.selectedDeckId) {
      currentDeck = migratedDeckRecords.find((d) => d.deckId === uiState.selectedDeckId) ?? null;
    }
    if (!currentDeck && migratedDeckRecords.length > 0) {
      currentDeck = migratedDeckRecords[0];
    }

    skipHistory(() =>
      set({
        initialized: true,
        cards: cardRecords.map(cardRecordToCard),
        decks,
        currentDeck,
        selection: uiState.selection,
        selectedCardIdForAdd: null,
        past: [],
        future: [],
      }),
    );
  },

  clearAll: async () => {
    await clearAll();
    clearUiState();

    skipHistory(() =>
      set({
        cards: [],
        decks: [],
        currentDeck: null,
        selection: null,
        selectedCardIdForAdd: null,
        addNodeForm: createDefaultNodeFormData(),
        past: [],
        future: [],
        isNodeEditing: false,
      }),
    );
    saveUiState({ selectedDeckId: null });
  },
}));

useComboStore.subscribe((state, prevState) => {
  if (state.currentDeck !== prevState.currentDeck) {
    if (state.currentDeck && !isRestoringHistoryValue()) {
      saveDeck(state.currentDeck).catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Failed to save deck to IndexedDB:', error);
      });
    }
    if (isRecordingHistoryValue() && prevState.currentDeck) {
      recordHistory(useComboStore.setState, prevState.currentDeck);
    }
  }
});

export function performUndo() {
  setRestoringHistory(true);
  useComboStore.getState().undo();
  setRestoringHistory(false);
}

export function performRedo() {
  setRestoringHistory(true);
  useComboStore.getState().redo();
  setRestoringHistory(false);
}

export { skipHistory } from './slices/historySlice';
export { findRouteByStepId, findRouteByConnectionId, relayoutDeck } from './routeUtils';
