import type { StateCreator } from 'zustand';
import {
  deleteDeck,
  getCard,
  getDeck,
  saveCard,
  saveDeck,
  type DeckRecord,
} from '../../../../shared/cardDatabase';
import { generateId } from '../../../../shared/id';
import { saveUiState } from '../../../../shared/uiStorage';
import type { Card, Connection, Step } from '../../../combo/model/types';
import { buildComboDocumentFromParsedNeuron } from '../../../neuron/services/parseNeuronHtml';
import type { ParsedNeuronDeck } from '../../../neuron/services/parseNeuronHtml';
import { NODE_HEIGHT, NODE_HORIZONTAL_GAP, NODE_WIDTH } from '../layout';
import {
  addStepToRoute,
  applyStepUpdates,
  createEmptyDeck,
  createInitialRoute,
  updateCurrentRoute,
  updateRouteConnection,
  updateRouteStep,
} from '../routeUtils';
import type { ComboActions, ComboState, DeckActions, DeckState } from '../types';

export const createDeckSlice: StateCreator<
  ComboState & ComboActions,
  [],
  [],
  DeckState & DeckActions
> = (set, get) => ({
  decks: [],
  currentDeck: null,

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

    get()._skipHistory(() =>
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

      const updatedRoute = {
        ...route,
        steps: [...route.steps, newStep],
        connections: newConnections,
      };

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
      const position =
        sourceStep && targetStep
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

      const updatedRoute = {
        ...route,
        steps: [...route.steps, newStep],
        connections: newConnections,
      };

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
          updateRouteStep(route, stepId, (s) => applyStepUpdates(s, updates)),
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
          updateRouteStep(route, stepId, (s) => ({ ...s, position })),
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

      if (
        !route.steps.some((s) => s.id === connection.source) ||
        !route.steps.some((s) => s.id === connection.target)
      ) {
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

      if (
        !route.steps.some((s) => s.id === source) ||
        !route.steps.some((s) => s.id === target)
      ) {
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

      const updatedRoute = {
        ...route,
        connections: route.connections.filter((c) => c.id !== id),
      };

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
        newCards.push(card);
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

  importNeuronHtml: async (data: ParsedNeuronDeck, imageFiles: File[]) => {
    function normalizeFileName(name: string): string {
      try {
        return decodeURIComponent(name).normalize('NFC');
      } catch {
        return name.normalize('NFC');
      }
    }

    function extractBasename(src: string): string {
      const withoutQuery = src.split('?')[0]?.split('#')[0] ?? '';
      return withoutQuery.split('/').pop() ?? withoutQuery.split('\\').pop() ?? '';
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

    get()._skipHistory(() => {
      set((state) => {
        const cardMap = new Map(state.cards.map((card) => [card.id, card]));
        for (const card of doc.cardCatalog) {
          cardMap.set(card.id, card);
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

  clearRoute: () => {
    const { currentDeck } = get();
    if (!currentDeck) return;
    set({
      currentDeck: { ...currentDeck, route: createInitialRoute(currentDeck.name) },
      selection: null,
    });
  },
});
