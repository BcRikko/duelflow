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

  // Route management
  addRoute: (name?: string) => string;
  selectRoute: (id: string) => void;
  deleteRoute: (id: string) => void;
  updateRoute: (id: string, updates: Partial<Omit<Route, 'id' | 'steps' | 'connections'>>) => void;

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
  const initialRoute = createInitialRoute(name);
  return {
    deckId: generateId('deck_'),
    name,
    source: { type: 'neuron', deckCode: '' },
    cards: [],
    routes: [initialRoute],
    currentRouteId: initialRoute.id,
  };
}

function cardRecordToCard(record: CardRecord): Card {
  return {
    id: record.cardId,
    name: record.name,
    type: record.type,
    imageUrl: '',
  };
}

export function findRouteByStepId(routes: Route[], stepId: string): Route | undefined {
  return routes.find((route) => route.steps.some((step) => step.id === stepId));
}

export function findRouteByConnectionId(routes: Route[], connectionId: string): Route | undefined {
  return routes.find((route) => route.connections.some((conn) => conn.id === connectionId));
}

function updateDeckRoute(
  deck: DeckRecord,
  routeId: string,
  updater: (route: Route) => Route,
): DeckRecord {
  return {
    ...deck,
    routes: deck.routes.map((route) => (route.id === routeId ? updater(route) : route)),
  };
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
  const updatedRoutes: Route[] = [];

  for (let i = 0; i < deck.routes.length; i++) {
    const route = deck.routes[i];
    const offset = getRouteOffset(i);
    const layout = calculateLayout(route, offset.x, offset.y);
    updatedRoutes.push({ ...route, steps: layout.steps });
  }

  return { ...deck, routes: updatedRoutes };
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

    let decks = deckRecords.map((deck) => ({ deckId: deck.deckId, name: deck.name }));
    let currentDeck: DeckRecord | null = null;

    if (uiState.selectedDeckId) {
      currentDeck = deckRecords.find((d) => d.deckId === uiState.selectedDeckId) ?? null;
    }
    if (!currentDeck && deckRecords.length > 0) {
      currentDeck = deckRecords[0];
    }
    if (!currentDeck) {
      currentDeck = createEmptyDeck();
      await saveDeck(currentDeck);
      decks = [{ deckId: currentDeck.deckId, name: currentDeck.name }];
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
    let nextDeck: DeckRecord | null = null;

    if (state.currentDeck?.deckId === deckId) {
      if (decks.length > 0) {
        nextDeck = await getDeck(decks[0]!.deckId);
      }
      if (!nextDeck) {
        nextDeck = createEmptyDeck();
        await saveDeck(nextDeck);
        decks.push({ deckId: nextDeck.deckId, name: nextDeck.name });
      }
    } else {
      nextDeck = state.currentDeck;
    }

    set({ decks, currentDeck: nextDeck, selection: null });
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

  addRoute: (name) => {
    const { currentDeck } = get();
    if (!currentDeck) return '';

    const routeName = name?.trim() || currentDeck.name || '新規ルート';
    const newRoute = createInitialRoute(routeName);
    set((state) => ({
      currentDeck: state.currentDeck
        ? {
            ...state.currentDeck,
            routes: [...state.currentDeck.routes, newRoute],
            currentRouteId: newRoute.id,
          }
        : null,
      selection: null,
    }));
    return newRoute.id;
  },

  selectRoute: (id) => {
    const { currentDeck } = get();
    if (!currentDeck || currentDeck.currentRouteId === id) return;
    set({
      currentDeck: { ...currentDeck, currentRouteId: id },
      selection: null,
    });
  },

  deleteRoute: (id) => {
    const { currentDeck } = get();
    if (!currentDeck) return;

    let routes = currentDeck.routes.filter((r) => r.id !== id);
    if (routes.length === 0) {
      routes = [createInitialRoute(currentDeck.name || '新規ルート')];
    }
    const relayouted = relayoutDeck({ ...currentDeck, routes });

    set({
      currentDeck: {
        ...relayouted,
        currentRouteId: relayouted.routes[0]?.id ?? null,
      },
      selection: null,
    });
  },

  updateRoute: (id, updates) => {
    const { currentDeck } = get();
    if (!currentDeck) return;
    set({
      currentDeck: updateDeckRoute(currentDeck, id, (route) => ({ ...route, ...updates })),
    });
  },

  addCardToCatalog: async (card, imageFile) => {
    const id = generateId('card_');
    await saveCard(id, card.name, card.type, imageFile);

    set((state) => ({
      cards: [...state.cards, { ...card, id }],
    }));
    return id;
  },

  updateCardInCatalog: async (id, updates, imageFile) => {
    const { cards } = get();
    const current = cards.find((c) => c.id === id);
    if (!current) return;

    const next = { ...current, ...updates };
    await saveCard(id, next.name, next.type, imageFile);

    set((state) => ({
      cards: state.cards.map((card) => (card.id === id ? next : card)),
    }));
  },

  removeCardFromCatalog: async (id) => {
    await deleteCard(id);

    set((state) => ({
      cards: state.cards.filter((card) => card.id !== id),
    }));
  },

  addStepToEnd: (step) => {
    const { currentDeck } = get();
    if (!currentDeck) return '';
    const currentRouteId = currentDeck.currentRouteId;
    if (!currentRouteId) return '';

    const newStepId = generateId('step_');
    set((state) => {
      const deck = state.currentDeck;
      if (!deck) return {};
      const route = deck.routes.find((r) => r.id === currentRouteId);
      if (!route) return {};

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
        currentDeck: updateDeckRoute(deck, route.id, () => updatedRoute),
        selection: { type: 'step', id: newStepId },
      };
    });
    return newStepId;
  },

  addStepAtPosition: (step, position) => {
    const { currentDeck } = get();
    if (!currentDeck) return '';
    const currentRouteId = currentDeck.currentRouteId;
    if (!currentRouteId) return '';

    const newStepId = generateId('step_');
    set((state) => {
      const deck = state.currentDeck;
      if (!deck) return {};
      const route = deck.routes.find((r) => r.id === currentRouteId);
      if (!route) return {};

      const newStep = { ...step, id: newStepId, position } as Step;

      return {
        currentDeck: updateDeckRoute(deck, route.id, (r) => ({
          ...r,
          steps: [...r.steps, newStep],
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
      const route = findRouteByStepId(deck.routes, afterStepId);
      if (!route) return {};

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
        currentDeck: updateDeckRoute(deck, route.id, () => updatedRoute),
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
      const route = findRouteByStepId(deck.routes, sourceStepId);
      if (!route) return {};

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
        currentDeck: updateDeckRoute(deck, route.id, () => updatedRoute),
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
      const route = findRouteByConnectionId(deck.routes, connectionId);
      if (!route) return {};

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
        currentDeck: updateDeckRoute(deck, route.id, () => updatedRoute),
        selection: { type: 'step', id: newStepId },
      };
    });
    return newStepId;
  },

  updateStep: (stepId, updates) => {
    set((state) => {
      const deck = state.currentDeck;
      if (!deck) return {};
      const route = findRouteByStepId(deck.routes, stepId);
      if (!route) return {};

      return {
        currentDeck: updateDeckRoute(deck, route.id, (r) =>
          updateRouteStep(r, stepId, (step) => applyStepUpdates(step, updates)),
        ),
      };
    });
  },

  updateStepPosition: (stepId, position) => {
    set((state) => {
      const deck = state.currentDeck;
      if (!deck) return {};
      const route = findRouteByStepId(deck.routes, stepId);
      if (!route) return {};

      return {
        currentDeck: updateDeckRoute(deck, route.id, (r) =>
          updateRouteStep(r, stepId, (step) => ({ ...step, position })),
        ),
      };
    });
  },

  deleteStep: (stepId) => {
    set((state) => {
      const deck = state.currentDeck;
      if (!deck) return {};
      const route = findRouteByStepId(deck.routes, stepId);
      if (!route) return {};

      const incoming = route.connections.filter((c) => c.target === stepId);
      const outgoing = route.connections.filter((c) => c.source === stepId);

      let newConnections = route.connections.filter(
        (c) => c.source !== stepId && c.target !== stepId,
      );
      for (const inc of incoming) {
        for (const out of outgoing) {
          newConnections.push({
            id: generateId('conn_'),
            source: inc.source,
            target: out.target,
          });
        }
      }

      const newSteps = route.steps.filter((s) => s.id !== stepId);

      return {
        currentDeck: updateDeckRoute(deck, route.id, (r) => ({
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
      const route = findRouteByStepId(deck.routes, connection.source);
      if (!route) return {};
      if (!route.steps.some((s) => s.id === connection.target)) return {};

      const exists = route.connections.some(
        (c) => c.source === connection.source && c.target === connection.target,
      );
      if (exists) return {};

      added = true;
      return {
        currentDeck: updateDeckRoute(deck, route.id, (r) => ({
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
      const route = findRouteByConnectionId(deck.routes, id);
      if (!route) return {};

      return {
        currentDeck: updateDeckRoute(deck, route.id, (r) =>
          updateRouteConnection(r, id, (conn) => ({ ...conn, ...updates })),
        ),
      };
    });
  },

  updateConnectionEndpoints: (id, source, target) => {
    if (source === target) return;

    set((state) => {
      const deck = state.currentDeck;
      if (!deck) return {};
      const route = findRouteByConnectionId(deck.routes, id);
      if (!route) return {};

      if (!route.steps.some((s) => s.id === source) || !route.steps.some((s) => s.id === target)) {
        return {};
      }

      const exists = route.connections.some(
        (c) => c.id !== id && c.source === source && c.target === target,
      );
      if (exists) return {};

      return {
        currentDeck: updateDeckRoute(deck, route.id, (r) =>
          updateRouteConnection(r, id, (conn) => ({ ...conn, source, target })),
        ),
      };
    });
  },

  deleteConnection: (id) => {
    set((state) => {
      const deck = state.currentDeck;
      if (!deck) return {};
      const route = findRouteByConnectionId(deck.routes, id);
      if (!route) return {};

      const updatedRoute = { ...route, connections: route.connections.filter((c) => c.id !== id) };

      return {
        currentDeck: updateDeckRoute(deck, route.id, () => updatedRoute),
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
        await saveCard(card.id, card.name, card.type);
        newCards.push({ ...card, imageUrl: card.imageUrl || '' });
      }
    }

    await saveDeck(deck);

    set((state) => ({
      cards: [...state.cards, ...newCards],
      decks: [...state.decks, { deckId: deck.deckId, name: deck.name }],
      currentDeck: deck,
      selection: null,
    }));
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
      const imageSrc = data.main
        .concat(data.ex)
        .concat(data.side)
        .find((c) => c.id === card.id)?.imageSrc;
      if (!imageSrc) continue;

      const basename = extractBasename(imageSrc);
      if (!basename) continue;

      const file = findImageFile(basename, imageFileMap);
      if (file) {
        savePromises.push(saveCard(card.id, card.name, card.type, file));
      } else {
        // eslint-disable-next-line no-console
        console.warn(`[importNeuronHtml] 画像ファイルが見つかりません: ${basename}`);
      }
    }

    await Promise.all(savePromises);

    const deck: DeckRecord = {
      deckId: doc.deck.id,
      name: doc.deck.name,
      source: doc.deck.source,
      cards: doc.deck.cards,
      routes: [],
      currentRouteId: null,
    };
    const initialRoute = createInitialRoute(deck.name);
    deck.routes = [initialRoute];
    deck.currentRouteId = initialRoute.id;

    await saveDeck(deck);

    set((state) => ({
      cards: [...state.cards, ...doc.cardCatalog.map((c) => ({ ...c, imageUrl: '' }))],
      decks: [...state.decks, { deckId: deck.deckId, name: deck.name }],
      currentDeck: deck,
      selection: null,
    }));
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

  clearAll: async () => {
    await clearAll();
    clearUiState();

    const deck = createEmptyDeck();
    await saveDeck(deck);

    skipHistory(() =>
      set({
        cards: [],
        decks: [{ deckId: deck.deckId, name: deck.name }],
        currentDeck: deck,
        selection: null,
        selectedCardIdForAdd: null,
        addNodeForm: createDefaultNodeFormData(),
        past: [],
        future: [],
        isNodeEditing: false,
      }),
    );
    saveUiState({ selectedDeckId: deck.deckId });
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
      saveDeck(state.currentDeck).catch(() => {
        // IndexedDB 保存エラーは無視
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
