import type { DeckRecord } from '../../../shared/cardDatabase';
import type {
  ActionStep,
  Card,
  Connection,
  NoteStep,
  Route,
  Step,
} from '../../combo/model/types';
import type { ParsedNeuronDeck } from '../../neuron/services/parseNeuronHtml';
import type { NodeFormData } from '../model/form';

export type EditorSelection =
  | { type: 'step'; id: string }
  | { type: 'connection'; id: string }
  | null;

export type DeckSummary = {
  deckId: string;
  name: string;
};

export type UIState = {
  initialized: boolean;
  selection: EditorSelection;
  selectedCardIdForAdd: string | null;
  addNodeForm: NodeFormData;
  isNodeEditing: boolean;
};

export type UIActions = {
  setNodeEditing: (editing: boolean) => void;
  selectStep: (id: string | null) => void;
  selectConnection: (id: string | null) => void;
  clearSelection: () => void;
  selectCardForAdd: (id: string | null) => void;
  setAddNodeForm: (form: NodeFormData | ((prev: NodeFormData) => NodeFormData)) => void;
  resetAddNodeForm: () => void;
};

export type CardCatalogState = {
  cards: Card[];
};

export type CardCatalogActions = {
  addCardToCatalog: (card: Omit<Card, 'id'>, imageFile?: File) => Promise<string>;
  updateCardInCatalog: (
    id: string,
    updates: Partial<Omit<Card, 'id'>>,
    imageFile?: File,
  ) => Promise<void>;
  removeCardFromCatalog: (id: string) => Promise<void>;
};

export type DeckState = {
  decks: DeckSummary[];
  currentDeck: DeckRecord | null;
};

export type DeckActions = {
  createDeck: (name?: string) => Promise<string>;
  selectDeck: (deckId: string) => Promise<void>;
  deleteDeck: (deckId: string) => Promise<void>;
  renameCurrentDeck: (name: string) => void;
  renameDeck: (deckId: string, name: string) => void;
  updateRoute: (updates: Partial<Omit<Route, 'id' | 'steps' | 'connections'>>) => void;
  addStepToEnd: (step: Omit<Step, 'id' | 'position'>) => string;
  addStepAtPosition: (
    step: Omit<Step, 'id' | 'position'>,
    position: { x: number; y: number },
  ) => string;
  addStepAfter: (afterStepId: string, step: Omit<Step, 'id' | 'position'>) => string;
  addBranch: (
    sourceStepId: string,
    step: Omit<Step, 'id' | 'position'>,
    label?: string,
  ) => string;
  insertStepOnConnection: (
    connectionId: string,
    step: Omit<Step, 'id' | 'position'>,
  ) => string;
  updateStep: {
    (
      stepId: string,
      updates: Partial<Omit<ActionStep, 'id' | 'type' | 'position'>>,
    ): void;
    (
      stepId: string,
      updates: Partial<Omit<NoteStep, 'id' | 'type' | 'position'>>,
    ): void;
  };
  updateStepPosition: (stepId: string, position: { x: number; y: number }) => void;
  deleteStep: (stepId: string) => void;
  addConnection: (connection: Omit<Connection, 'id'>) => string;
  updateConnection: (id: string, updates: Partial<Omit<Connection, 'id'>>) => void;
  updateConnectionEndpoints: (id: string, source: string, target: string) => void;
  deleteConnection: (id: string) => void;
  importDocument: (deck: DeckRecord, cardCatalog?: Card[]) => Promise<void>;
  importNeuronHtml: (data: ParsedNeuronDeck, imageFiles: File[]) => Promise<void>;
  exportDocument: () => DeckRecord | null;
  clearRoute: () => void;
};

export type HistoryState = {
  past: DeckRecord[];
  future: DeckRecord[];
};

export type HistoryActions = {
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  resetHistory: () => void;
};

export type InternalActions = {
  _skipHistory: (fn: () => void) => void;
};

export type ComboState = UIState & CardCatalogState & DeckState & HistoryState;

export type ComboActions = UIActions &
  CardCatalogActions &
  DeckActions &
  HistoryActions &
  InternalActions & {
    initialize: () => Promise<void>;
    clearAll: () => Promise<void>;
  };
