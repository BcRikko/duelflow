import type { StateCreator } from 'zustand';
import type { DeckRecord } from '../../../../shared/cardDatabase';
import type { ComboActions, ComboState, HistoryActions, HistoryState } from '../types';

const MAX_HISTORY = 50;

let isRestoringHistory = false;
let isRecordingHistory = true;

export function skipHistory(fn: () => void) {
  isRecordingHistory = false;
  fn();
  isRecordingHistory = true;
}

export function setRestoringHistory(value: boolean) {
  isRestoringHistory = value;
}

export function isRestoringHistoryValue() {
  return isRestoringHistory;
}

export function isRecordingHistoryValue() {
  return isRecordingHistory;
}

export const createHistorySlice: StateCreator<
  ComboState & ComboActions,
  [],
  [],
  HistoryState & HistoryActions & InternalHistoryActions
> = (set, get) => ({
  past: [],
  future: [],

  undo: () => {
    const { past, future, currentDeck } = get();
    if (past.length === 0 || !currentDeck) return;

    const previous = past[past.length - 1];
    set({
      currentDeck: previous,
      selection: null,
      past: past.slice(0, -1),
      future: [...future, currentDeck],
    });
  },

  redo: () => {
    const { past, future, currentDeck } = get();
    if (future.length === 0 || !currentDeck) return;

    const next = future[future.length - 1];
    set({
      currentDeck: next,
      selection: null,
      past: [...past, currentDeck],
      future: future.slice(0, -1),
    });
  },

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,

  resetHistory: () => set({ past: [], future: [] }),

  _skipHistory: (fn) => skipHistory(fn),
});

type InternalHistoryActions = {
  _skipHistory: (fn: () => void) => void;
};

export function recordHistory(
  setState: (
    fn: (state: ComboState & ComboActions) => Partial<ComboState & ComboActions>,
  ) => void,
  previousDeck: DeckRecord,
) {
  if (isRestoringHistory || !isRecordingHistory) return;

  setState((state) => ({
    past: [...state.past.slice(-(MAX_HISTORY - 1)), previousDeck],
    future: [],
  }));
}
