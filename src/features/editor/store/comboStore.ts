import { create } from 'zustand';
import { generateId } from '../../../shared/id';
import {
  clearAll,
  deleteCard,
  deleteDeck,
  getAllCards,
  getAllDecks,
  getCard,
  getDeck,
  saveCard,
  saveDeck,
  type CardRecord,
  type DeckRecord,
} from '../../../shared/cardDatabase';
import { clearUiState, loadUiState, saveUiState } from '../../../shared/uiStorage';
import { migrateStepCardRole } from '../../combo/model/schema';
import type {
  ActionStep,
  Card,
  Connection,
  NoteStep,
  Route,
  Step,
} from '../../combo/model/types';
import type { NodeFormData } from '../model/form';
import { createDefaultNodeFormData } from '../model/form';
import type { ParsedNeuronDeck } from '../../neuron/services/parseNeuronHtml';
import { buildComboDocumentFromParsedNeuron } from '../../neuron/services/parseNeuronHtml';
import { calculateLayout, getRouteOffset, NODE_HEIGHT, NODE_HORIZONTAL_GAP, NODE_WIDTH } from './layout';

export type EditorSelection =
  | { type: 'step'; id: string }
  | { type: 'connection'; id: string }
  | null;

type DeckSummary = {
  deckId: string;
  name: string;
};

type ComboState = {
  initialized: boolean;
  cards: Card[];
  decks: DeckSummary[];
  currentDeck: DeckRecord | null;
  selection: EditorSelection;
  selectedCardIdForAdd: string | null;
  addNodeForm: NodeFormData;
  past: DeckRecord[];
  future: DeckRecord[];
  isNodeEditing: boolean;
};

type ComboActions = {
  // Lifecycle
  initialize: () => Promise<void>;

  // UI state
  setNodeEditing: (editing: boolean) => void;

  // Selection
  selectStep: (id: string | null) => void;
  selectConnection: (id: string | null) => void;
  clearSelection: () => void;
  selectCardForAdd: (id: string | null) => void;
  setAddNodeForm: (form: NodeFormData | ((prev: NodeFormData) => NodeFormData)) => void;
  resetAddNodeForm: () => void;

  // Deck management
  createDeck: (name?: string) => Promise<string>;
  selectDeck: (deckId: string) => Promise<void>;
  deleteDeck: (deckId: string) => Promise<void>;
  renameCurrentDeck: (name: string) => void;
  renameDeck: (deckId: string, name: string) => void;

  // Route management
  updateRoute: (updates: Partial<Omit<Route, 'id' | 'steps' | 'connections'>>) => void;

  // Card catalog
  addCardToCatalog: (card: Omit<Card, 'id'>, imageFile?: File) => Promise<string>;
  updateCardInCatalog: (id: string, updates: Partial<Omit<Card, 'id'>>, imageFile?: File) => Promise<void>;
  removeCardFromCatalog: (id: string) => Promise<void>;

  // Step management
  addStepToEnd: (step: Omit<Step, 'id' | 'position'>) => string;
  addStepAtPosition: (step: Omit<Step, 'id' | 'position'>, position: { x: number; y: number }) => string;
  addStepAfter: (afterStepId: string, step: Omit<Step, 'id' | 'position'>) => string;
  addBranch: (
    sourceStepId: string,
    step: Omit<Step, 'id' | 'position'>,
    label?: string,
  ) => string;
  insertStepOnConnection: (connectionId: string, step: Omit<Step, 'id' | 'position'>) => string;
  updateStep: (
    stepId: string,
    updates: Partial<Omit<ActionStep, 'id' | 'type' | 'position'>> | Partial<Omit<NoteStep, 'id' | 'type' | 'position'>>,
  ) => void;
  updateStepPosition: (stepId: string, position: { x: number; y: number }) => void;
  deleteStep: (stepId: string) => void;

  // Connection management
  addConnection: (connection: Omit<Connection, 'id'>) => string;
  updateConnection: (id: string, updates: Partial<Omit<Connection, 'id'>>) => void;
  updateConnectionEndpoints: (id: string, source: string, target: string) => void;
  deleteConnection: (id: string) => void;

  // Document I/O
  importDocument: (deck: DeckRecord, cardCatalog?: Card[]) => Promise<void>;
  importNeuronHtml: (data: ParsedNeuronDeck, imageFiles: File[]) => Promise<void>;
  exportDocument: () => DeckRecord | null;

  // History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Reset
  clearRoute: () => void;
  clearAll: () => Promise<void>;
};

function createInitialRoute(name = '新規ルート'): Route {
  return {
    id: generateId('route_'),
    name,
    description: '',
    startingCardIds: [],
    steps: [],
    connections: [],
    result: {
      cardIds: [],
      description: '',
    },
  };
}

function createEmptyDeck(name = '新規デッキ'): DeckRecord {
  return {
    deckId: generateId('deck_'),
    name,
    source: { type: 'neuron', deckCode: '' },
    cards: [],
    route: createInitialRoute(name),
  };
}

function cardRecordToCard(record: CardRecord): Card {
  return {
    id: record.cardId,
    name: record.name,
    type: record.type,
    description: record.description,
    imageUrl: '',
  };
}

function toRouteArray(route: Route | Route[]): Route[] {
  return Array.isArray(route) ? route : [route];
}

export function findRouteByStepId(route: Route | Route[], stepId: string): Route | undefined {
  return toRouteArray(route).find((r) => r.steps.some((step) => step.id === stepId));
}

export function findRouteByConnectionId(
  route: Route | Route[],
  connectionId: string,
): Route | undefined {
  return toRouteArray(route).find((r) => r.connections.some((conn) => conn.id === connectionId));
}

function updateCurrentRoute(deck: DeckRecord, updater: (route: Route) => Route): DeckRecord {
  return { ...deck, route: updater(deck.route) };
}

function updateRouteStep(route: Route, stepId: string, updater: (step: Step) => Step): Route {
  return {
    ...route,
    steps: route.steps.map((step) => (step.id === stepId ? updater(step) : step)),
  };
}

function updateRouteConnection(
  route: Route,
  connectionId: string,
  updater: (conn: Connection) => Connection,
): Route {
  return {
    ...route,
    connections: route.connections.map((conn) => (conn.id === connectionId ? updater(conn) : conn)),
  };
}

export function relayoutDeck(deck: DeckRecord): DeckRecord {
  const offset = getRouteOffset(0);
  const layout = calculateLayout(deck.route, offset.x, offset.y);
  return { ...deck, route: { ...deck.route, steps: layout.steps } };
}

function applyStepUpdates(
  step: Step,
  updates: Partial<Omit<ActionStep, 'id' | 'type' | 'position'>> | Partial<Omit<NoteStep, 'id' | 'type' | 'position'>>,
): Step {
  if (step.type === 'action') {
    const actionUpdates = updates as Partial<Omit<ActionStep, 'id' | 'type' | 'position'>>;
    return {
      ...step,
      ...(actionUpdates.actions !== undefined && { actions: actionUpdates.actions }),
      ...(actionUpdates.cardId !== undefined && { cardId: actionUpdates.cardId }),
      ...(actionUpdates.relatedCards !== undefined && { relatedCards: actionUpdates.relatedCards }),
      ...(actionUpdates.description !== undefined && { description: actionUpdates.description }),
    } as Step;
  }

  const noteUpdates = updates as Partial<Omit<NoteStep, 'id' | 'type' | 'position'>>;
  return {
    ...step,
    ...(noteUpdates.description !== undefined && { description: noteUpdates.description }),
  } as Step;
}

function addStepToRoute(route: Route, newStep: Step): Route {
  const newRoute = { ...route, steps: [...route.steps, newStep] };
  const outgoing = new Set(newRoute.connections.map((c) => c.source));
  const terminals = newRoute.steps.filter((s) => s.id !== newStep.id && !outgoing.has(s.id));

  if (terminals.length === 0) {
    return newRoute;
  }

  return {
    ...newRoute,
    connections: [
      ...newRoute.connections,
      ...terminals.map((terminal) => ({
        id: generateId('conn_'),
        source: terminal.id,
        target: newStep.id,
      })),
    ],
  };
}

function migrateRouteRoles(route: Route): Route {
  return {
    ...route,
    steps: route.steps.map((step) => {
      if (step.type !== 'action') return step;
      return {
        ...step,
        relatedCards: step.relatedCards.map((related) => ({
          ...related,
          role: migrateStepCardRole(related.role),
        })),
      };
    }),
  };
}

export const useComboStore = create<ComboState & ComboActions>((set, get) => ({
  initialized: false,
  cards: [],
  decks: [],
  currentDeck: null,
  selection: null,
  selectedCardIdForAdd: null,
  addNodeForm: createDefaultNodeFormData(),
  past: [],
  future: [],
  isNodeEditing: false,

  initialize: async () => {
    const [cardRecords, deckRecords] = await Promise.all([getAllCards(), getAllDecks()]);
    const uiState = loadUiState();

    const migratedDeckRecords = deckRecords.map((deck) => ({
      ...deck,
      route: migrateRouteRoles(deck.route),
    }));

    let decks = migratedDeckRecords.map((deck) => ({ deckId: deck.deckId, name: deck.name }));
    let currentDeck: DeckRecord | null = null;

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
        addNodeForm: createDefaultNodeFormData(),
        past: [],
        future: [],
        isNodeEditing: false,
      }),
    );
  },

  setNodeEditing: (editing) => set({ isNodeEditing: editing }),

  selectStep: (id) =>
    set({ selection: id ? { type: 'step', id } : null, selectedCardIdForAdd: null }),
  selectConnection: (id) =>
    set({ selection: id ? { type: 'connection', id } : null, selectedCardIdForAdd: null }),
  clearSelection: () => set({ selection: null }),
  selectCardForAdd: (id) =>
    set((state) => ({
      selectedCardIdForAdd: id,
      selection: null,
      addNodeForm:
        id && state.addNodeForm.type === 'action'
          ? { ...state.addNodeForm, cardId: id }
          : state.addNodeForm,
    })),
  setAddNodeForm: (form) =>
    set((state) => ({
      addNodeForm: typeof form === 'function' ? form(state.addNodeForm) : form,
    })),
  resetAddNodeForm: () =>
    set((state) => ({
      addNodeForm: createDefaultNodeFormData(state.selectedCardIdForAdd),
    })),

  createDeck: async (name) => {
    const deck = createEmptyDeck(name?.trim() || '新規デッキ');
    await saveDeck(deck);

    set((state) => ({
      decks: [...state.decks, { deckId: deck.deckId, name: deck.name }],
      currentDeck: deck,
      selection: null,
    }));
    saveUiState({ selectedDeckId: deck.deckId });

    return deck.deckId;
  },

  selectDeck: async (deckId) => {
    const deck = await getDeck(deckId);
    if (!deck) return;

    skipHistory(() =>
      set({
        currentDeck: deck,
        selection: null,
        past: [],
        future: [],
      }),
    );
    saveUiState({ selectedDeckId: deckId });
  },

  deleteDeck: async (deckId) => {
    await deleteDeck(deckId);

    const state = get();
    const decks = state.decks.filter((d) => d.deckId !== deckId);
    let nextDeck: DeckRecord | null = state.currentDeck;

    if (state.currentDeck?.deckId === deckId) {
      nextDeck = decks.length > 0 ? await getDeck(decks[0]!.deckId) : null;
    }

    set({ decks, currentDeck: nextDeck, selection: null });
    if (!nextDeck) {
      saveUiState({ selectedDeckId: null });
    }
  },

  renameCurrentDeck: (name) => {
    const { currentDeck } = get();
    if (!currentDeck) return;
    const trimmed = name.trim();
    if (!trimmed) return;

    set((state) => ({
      currentDeck: { ...state.currentDeck!, name: trimmed },
      decks: state.decks.map((d) =>
        d.deckId === state.currentDeck!.deckId ? { ...d, name: trimmed } : d,
      ),
    }));
  },

  renameDeck: (deckId, name) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const state = get();
    const target = state.decks.find((d) => d.deckId === deckId);
    if (!target || target.name === trimmed) return;

    set({
      decks: state.decks.map((d) => (d.deckId === deckId ? { ...d, name: trimmed } : d)),
      currentDeck:
        state.currentDeck?.deckId === deckId
          ? { ...state.currentDeck, name: trimmed }
          : state.currentDeck,
    });

    if (state.currentDeck?.deckId !== deckId) {
      void getDeck(deckId).then((record) => {
        if (record) {
          void saveDeck({ ...record, name: trimmed });
        }
      });
    }
  },

  updateRoute: (updates) => {
    const { currentDeck } = get();
    if (!currentDeck) return;
    set({
      currentDeck: updateCurrentRoute(currentDeck, (route) => ({ ...route, ...updates })),
    });
  },

  addCardToCatalog: async (card, imageFile) => {
    const id = generateId('card_');
    await saveCard(id, card.name, card.type, { file: imageFile, description: card.description });

    set((state) => {
      const nextCards = [...state.cards, { ...card, id }];
      const currentDeck = state.currentDeck;
      if (!currentDeck || currentDeck.cards.some((entry) => entry.cardId === id)) {
        return { cards: nextCards };
      }
      return {
        cards: nextCards,
        currentDeck: {
          ...currentDeck,
          cards: [...currentDeck.cards, { cardId: id, quantity: 1, section: 'main' }],
        },
      };
    });
    return id;
  },

  updateCardInCatalog: async (id, updates, imageFile) => {
    const { cards } = get();
    const current = cards.find((c) => c.id === id);
    if (!current) return;

    const next = { ...current, ...updates };
    await saveCard(id, next.name, next.type, { file: imageFile, description: next.description });

    set((state) => ({
      cards: state.cards.map((card) => (card.id === id ? next : card)),
    }));
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

  addStepToEnd: (step) => {
    const { currentDeck } = get();
    if (!currentDeck) return '';

    const newStepId = generateId('step_');
    set((state) => {
      const deck = state.currentDeck;
      if (!deck) return {};
      const route = deck.route;

      const outgoing = new Set(route.connections.map((c) => c.source));
      const terminals = route.steps.filter((s) => !outgoing.has(s.id));
      const reference =
        terminals.length > 0
          ? terminals.reduce((a, b) => (a.position.x >= b.position.x ? a : b))
          : route.steps[route.steps.length - 1];
      const position = reference
        ? { x: reference.position.x + NODE_WIDTH + NODE_HORIZONTAL_GAP, y: reference.position.y }
        : { x: 0, y: 0 };

      const newStep = { ...step, id: newStepId, position } as Step;
      const updatedRoute = addStepToRoute(route, newStep);

      return {
        currentDeck: updateCurrentRoute(deck, () => updatedRoute),
        selection: { type: 'step', id: newStepId },
      };
    });
    return newStepId;
  },

  addStepAtPosition: (step, position) => {
    const { currentDeck } = get();
    if (!currentDeck) return '';

    const newStepId = generateId('step_');
    set((state) => {
      const deck = state.currentDeck;
      if (!deck) return {};

      const newStep = { ...step, id: newStepId, position } as Step;

      return {
        currentDeck: updateCurrentRoute(deck, (route) => ({
          ...route,
          steps: [...route.steps, newStep],
        })),
        selection: { type: 'step', id: newStepId },
      };
    });
    return newStepId;
  },

  addStepAfter: (afterStepId, step) => {
    const newStepId = generateId('step_');
    set((state) => {
      const deck = state.currentDeck;
      if (!deck) return {};
      const route = deck.route;

      const originalTargets = route.connections
        .filter((c) => c.source === afterStepId)
        .map((c) => c.target);
      const afterStep = route.steps.find((s) => s.id === afterStepId);
      const position = afterStep
        ? { x: afterStep.position.x + NODE_WIDTH + NODE_HORIZONTAL_GAP, y: afterStep.position.y }
        : { x: 0, y: 0 };
      const newStep = { ...step, id: newStepId, position } as Step;

      let newConnections: Connection[];
      if (originalTargets.length === 0) {
        newConnections = [
          ...route.connections,
          { id: generateId('conn_'), source: afterStepId, target: newStepId },
        ];
      } else {
        newConnections = [
          ...route.connections.filter((c) => c.source !== afterStepId),
          { id: generateId('conn_'), source: afterStepId, target: newStepId },
          ...originalTargets.map((target) => ({
            id: generateId('conn_'),
            source: newStepId,
            target,
          })),
        ];
      }

      const updatedRoute = { ...route, steps: [...route.steps, newStep], connections: newConnections };

      return {
        currentDeck: updateCurrentRoute(deck, () => updatedRoute),
        selection: { type: 'step', id: newStepId },
      };
    });
    return newStepId;
  },

  addBranch: (sourceStepId, step, label) => {
    const newStepId = generateId('step_');
    set((state) => {
      const deck = state.currentDeck;
      if (!deck) return {};
      const route = deck.route;

      const sourceStep = route.steps.find((s) => s.id === sourceStepId);
      if (!sourceStep) return {};

      const existingBranches = route.connections.filter((c) => c.source === sourceStepId).length;
      const offsetX = 220 + existingBranches * 40;
      const offsetY = existingBranches % 2 === 0 ? 120 : -120;

      const newStep = {
        ...step,
        id: newStepId,
        position: {
          x: sourceStep.position.x + offsetX,
          y: sourceStep.position.y + offsetY,
        },
      } as Step;

      const newConnection: Connection = {
        id: generateId('conn_'),
        source: sourceStepId,
        target: newStepId,
        label: label || `分岐 ${existingBranches + 1}`,
      };

      const updatedRoute = {
        ...route,
        steps: [...route.steps, newStep],
        connections: [...route.connections, newConnection],
      };

      return {
        currentDeck: updateCurrentRoute(deck, () => updatedRoute),
        selection: { type: 'connection', id: newConnection.id },
      };
    });
    return newStepId;
  },

  insertStepOnConnection: (connectionId, step) => {
    const newStepId = generateId('step_');
    set((state) => {
      const deck = state.currentDeck;
      if (!deck) return {};
      const route = deck.route;

      const connection = route.connections.find((c) => c.id === connectionId);
      if (!connection) return {};

      const sourceStep = route.steps.find((s) => s.id === connection.source);
      const targetStep = route.steps.find((s) => s.id === connection.target);
      const position = sourceStep && targetStep
        ? {
            x: (sourceStep.position.x + targetStep.position.x) / 2,
            y: (sourceStep.position.y + targetStep.position.y) / 2 + NODE_HEIGHT + 20,
          }
        : { x: 0, y: 0 };
      const newStep = { ...step, id: newStepId, position } as Step;
      const newConnections = [
        ...route.connections.filter((c) => c.id !== connectionId),
        { id: generateId('conn_'), source: connection.source, target: newStepId },
        { id: generateId('conn_'), source: newStepId, target: connection.target },
      ];

      const updatedRoute = { ...route, steps: [...route.steps, newStep], connections: newConnections };

      return {
        currentDeck: updateCurrentRoute(deck, () => updatedRoute),
        selection: { type: 'step', id: newStepId },
      };
    });
    return newStepId;
  },

  updateStep: (stepId, updates) => {
    set((state) => {
      const deck = state.currentDeck;
      if (!deck) return {};

      return {
        currentDeck: updateCurrentRoute(deck, (route) =>
          updateRouteStep(route, stepId, (step) => applyStepUpdates(step, updates)),
        ),
      };
    });
  },

  updateStepPosition: (stepId, position) => {
    set((state) => {
      const deck = state.currentDeck;
      if (!deck) return {};

      return {
        currentDeck: updateCurrentRoute(deck, (route) =>
          updateRouteStep(route, stepId, (step) => ({ ...step, position })),
        ),
      };
    });
  },

  deleteStep: (stepId) => {
    set((state) => {
      const deck = state.currentDeck;
      if (!deck) return {};
      const route = deck.route;

      const incoming = route.connections.filter((c) => c.target === stepId);
      const outgoing = route.connections.filter((c) => c.source === stepId);

      let newConnections = route.connections.filter(
        (c) => c.source !== stepId && c.target !== stepId,
      );
      const existingConnections = new Set(
        newConnections.map((c) => `${c.source}->${c.target}`),
      );
      for (const inc of incoming) {
        for (const out of outgoing) {
          const key = `${inc.source}->${out.target}`;
          if (existingConnections.has(key)) continue;
          existingConnections.add(key);
          newConnections.push({
            id: generateId('conn_'),
            source: inc.source,
            target: out.target,
          });
        }
      }

      const newSteps = route.steps.filter((s) => s.id !== stepId);

      return {
        currentDeck: updateCurrentRoute(deck, (r) => ({
          ...r,
          steps: newSteps,
          connections: newConnections,
        })),
        selection:
          state.selection?.type === 'step' && state.selection.id === stepId
            ? null
            : state.selection,
      };
    });
  },

  addConnection: (connection) => {
    if (connection.source === connection.target) return '';

    const id = generateId('conn_');
    let added = false;
    set((state) => {
      const deck = state.currentDeck;
      if (!deck) return {};
      const route = deck.route;

      if (!route.steps.some((s) => s.id === connection.source) || !route.steps.some((s) => s.id === connection.target)) {
        return {};
      }

      const exists = route.connections.some(
        (c) => c.source === connection.source && c.target === connection.target,
      );
      if (exists) return {};

      added = true;
      return {
        currentDeck: updateCurrentRoute(deck, (r) => ({
          ...r,
          connections: [...r.connections, { ...connection, id }],
        })),
      };
    });
    return added ? id : '';
  },

  updateConnection: (id, updates) => {
    set((state) => {
      const deck = state.currentDeck;
      if (!deck) return {};

      return {
        currentDeck: updateCurrentRoute(deck, (route) =>
          updateRouteConnection(route, id, (conn) => ({ ...conn, ...updates })),
        ),
      };
    });
  },

  updateConnectionEndpoints: (id, source, target) => {
    if (source === target) return;

    set((state) => {
      const deck = state.currentDeck;
      if (!deck) return {};
      const route = deck.route;

      if (!route.steps.some((s) => s.id === source) || !route.steps.some((s) => s.id === target)) {
        return {};
      }

      const exists = route.connections.some(
        (c) => c.id !== id && c.source === source && c.target === target,
      );
      if (exists) return {};

      return {
        currentDeck: updateCurrentRoute(deck, (route) =>
          updateRouteConnection(route, id, (conn) => ({ ...conn, source, target })),
        ),
      };
    });
  },

  deleteConnection: (id) => {
    set((state) => {
      const deck = state.currentDeck;
      if (!deck) return {};
      const route = deck.route;

      const updatedRoute = { ...route, connections: route.connections.filter((c) => c.id !== id) };

      return {
        currentDeck: updateCurrentRoute(deck, () => updatedRoute),
        selection:
          state.selection?.type === 'connection' && state.selection.id === id
            ? null
            : state.selection,
      };
    });
  },

  importDocument: async (deck, cardCatalog = []) => {
    const newCards: Card[] = [];

    for (const card of cardCatalog) {
      const existing = await getCard(card.id);
      if (!existing) {
        await saveCard(card.id, card.name, card.type, { description: card.description });
        newCards.push({ ...card, imageUrl: card.imageUrl || '' });
      }
    }

    await saveDeck(deck);

    set((state) => {
      const cardMap = new Map(state.cards.map((card) => [card.id, card]));
      for (const card of newCards) {
        cardMap.set(card.id, card);
      }

      const existingIndex = state.decks.findIndex((d) => d.deckId === deck.deckId);
      const decks =
        existingIndex >= 0
          ? state.decks.map((d, index) =>
              index === existingIndex ? { deckId: deck.deckId, name: deck.name } : d,
            )
          : [...state.decks, { deckId: deck.deckId, name: deck.name }];

      return {
        cards: Array.from(cardMap.values()),
        decks,
        currentDeck: deck,
        selection: null,
      };
    });
    saveUiState({ selectedDeckId: deck.deckId });
  },

  importNeuronHtml: async (data, imageFiles) => {
    function normalizeFileName(name: string): string {
      try {
        return decodeURIComponent(name).normalize('NFC');
      } catch {
        return name.normalize('NFC');
      }
    }

    function extractBasename(src: string): string {
      const withoutQuery = src.split('?')[0]?.split('#')[0] ?? '';
      return (
        withoutQuery.split('/').pop() ?? withoutQuery.split('\\').pop() ?? ''
      );
    }

    function findImageFile(srcBasename: string, fileMap: Map<string, File>): File | undefined {
      const normalized = normalizeFileName(srcBasename);
      const exact = fileMap.get(normalized);
      if (exact) return exact;

      const dotIndex = normalized.lastIndexOf('.');
      if (dotIndex <= 0) return undefined;
      const prefix = normalized.slice(0, dotIndex);
      for (const [fileName, file] of fileMap) {
        if (fileName.startsWith(prefix)) return file;
      }
      return undefined;
    }

    const imageFileMap = new Map(
      imageFiles.map((file) => [normalizeFileName(file.name), file]),
    );
    const doc = buildComboDocumentFromParsedNeuron(data);

    const savePromises: Promise<void>[] = [];
    for (const card of doc.cardCatalog) {
      const parsedCard = data.main
        .concat(data.ex)
        .concat(data.side)
        .find((c) => c.id === card.id);
      const imageSrc = parsedCard?.imageSrc;

      let file: File | undefined;
      if (imageSrc) {
        const basename = extractBasename(imageSrc);
        if (basename) {
          file = findImageFile(basename, imageFileMap);
          if (!file) {
            // eslint-disable-next-line no-console
            console.warn(`[importNeuronHtml] 画像ファイルが見つかりません: ${basename}`);
          }
        }
      }

      savePromises.push(
        saveCard(card.id, card.name, card.type, {
          file,
          description: card.description,
        }),
      );
    }

    await Promise.all(savePromises);

    const deck: DeckRecord = {
      deckId: doc.deck.id,
      name: doc.deck.name,
      source: doc.deck.source,
      cards: doc.deck.cards,
      route: createInitialRoute(doc.deck.name),
    };

    await saveDeck(deck);

    skipHistory(() => {
      set((state) => {
        const cardMap = new Map(state.cards.map((card) => [card.id, card]));
        for (const card of doc.cardCatalog) {
          cardMap.set(card.id, { ...card, imageUrl: '' });
        }
        return {
          cards: Array.from(cardMap.values()),
          decks: [...state.decks, { deckId: deck.deckId, name: deck.name }],
          currentDeck: deck,
          selection: null,
        };
      });
    });
    saveUiState({ selectedDeckId: deck.deckId });
  },

  exportDocument: () => get().currentDeck,

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

  clearRoute: () => {
    const { currentDeck } = get();
    if (!currentDeck) return;
    set({
      currentDeck: { ...currentDeck, route: createInitialRoute(currentDeck.name) },
      selection: null,
    });
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

// History management
const MAX_HISTORY = 50;
let isRestoringHistory = false;
let isRecordingHistory = true;

export function skipHistory(fn: () => void) {
  isRecordingHistory = false;
  fn();
  isRecordingHistory = true;
}

function recordHistory(previousDeck: DeckRecord) {
  if (isRestoringHistory || !isRecordingHistory) return;

  useComboStore.setState((state) => ({
    past: [...state.past.slice(-(MAX_HISTORY - 1)), previousDeck],
    future: [],
  }));
}

useComboStore.subscribe((state, prevState) => {
  if (state.currentDeck !== prevState.currentDeck) {
    if (state.currentDeck && !isRestoringHistory) {
      saveDeck(state.currentDeck).catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Failed to save deck to IndexedDB:', error);
      });
    }
    if (isRecordingHistory && prevState.currentDeck) {
      recordHistory(prevState.currentDeck);
    }
  }
});

export function performUndo() {
  isRestoringHistory = true;
  useComboStore.getState().undo();
  isRestoringHistory = false;
}

export function performRedo() {
  isRestoringHistory = true;
  useComboStore.getState().redo();
  isRestoringHistory = false;
}
