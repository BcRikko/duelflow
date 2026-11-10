import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { generateId } from '../../../shared/id';
import { clearAllCardImages, saveCardImage } from '../../../shared/imageStorage';
import { validateComboDocument } from '../../combo/model/schema';
import type {
  ActionStep,
  Card,
  ComboDocument,
  Connection,
  NoteStep,
  Route,
  Step,
} from '../../combo/model/types';
import type { NodeFormData } from '../model/form';
import { createDefaultNodeFormData } from '../model/form';
import type { ParsedNeuronDeck } from '../../neuron/services/parseNeuronHtml';
import { buildComboDocumentFromParsedNeuron } from '../../neuron/services/parseNeuronHtml';
import { calculateLayout, getRouteOffset } from './layout';

type EditorSelection =
  | { type: 'step'; id: string }
  | { type: 'connection'; id: string }
  | null;

type ComboState = {
  document: ComboDocument;
  currentRouteId: string | null;
  selection: EditorSelection;
  selectedCardIdForAdd: string | null;
  addNodeForm: NodeFormData;
  past: ComboDocument[];
  future: ComboDocument[];
  isNodeEditing: boolean;
};

type ComboActions = {
  // UI state
  setNodeEditing: (editing: boolean) => void;

  // Selection
  selectStep: (id: string | null) => void;
  selectConnection: (id: string | null) => void;
  clearSelection: () => void;
  selectCardForAdd: (id: string | null) => void;
  setAddNodeForm: (form: NodeFormData | ((prev: NodeFormData) => NodeFormData)) => void;
  resetAddNodeForm: () => void;

  // Route management
  addRoute: (name?: string) => string;
  selectRoute: (id: string) => void;
  deleteRoute: (id: string) => void;
  updateRoute: (id: string, updates: Partial<Omit<Route, 'id' | 'steps' | 'connections'>>) => void;

  // Card catalog
  addCardToCatalog: (card: Omit<Card, 'id'>) => string;
  updateCardInCatalog: (id: string, updates: Partial<Omit<Card, 'id'>>) => void;
  removeCardFromCatalog: (id: string) => void;

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
  importDocument: (doc: ComboDocument) => void;
  importNeuronHtml: (data: ParsedNeuronDeck, imageFiles: File[]) => Promise<void>;
  exportDocument: () => ComboDocument;
  updateDocument: (updates: Partial<ComboDocument>) => void;

  // History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Reset
  clearAll: () => Promise<void>;
};

function createEmptyDocument(): ComboDocument {
  return {
    schemaVersion: 2,
    deck: {
      id: generateId('deck_'),
      name: '新規デッキ',
      source: {
        type: 'neuron',
        deckCode: '',
      },
      cards: [],
    },
    cardCatalog: [],
    routes: [],
  };
}

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

export function findRouteByStepId(routes: Route[], stepId: string): Route | undefined {
  return routes.find((route) => route.steps.some((step) => step.id === stepId));
}

export function findRouteByConnectionId(routes: Route[], connectionId: string): Route | undefined {
  return routes.find((route) => route.connections.some((conn) => conn.id === connectionId));
}

function getRouteLayoutOffset(routes: Route[], routeId: string): { x: number; y: number } {
  const index = routes.findIndex((route) => route.id === routeId);
  return getRouteOffset(index);
}

function updateDocumentRoute(
  document: ComboDocument,
  routeId: string,
  updater: (route: Route) => Route,
): ComboDocument {
  return {
    ...document,
    routes: document.routes.map((route) => (route.id === routeId ? updater(route) : route)),
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

function layoutRoute(route: Route, routes: Route[]): Route {
  const offset = getRouteLayoutOffset(routes, route.id);
  return { ...route, steps: calculateLayout(route, offset.x, offset.y).steps };
}

export function relayoutDocument(document: ComboDocument): ComboDocument {
  const updatedRoutes: Route[] = [];

  for (let i = 0; i < document.routes.length; i++) {
    const route = document.routes[i];
    const offset = getRouteOffset(i);
    const layout = calculateLayout(route, offset.x, offset.y);
    updatedRoutes.push({ ...route, steps: layout.steps });
  }

  return { ...document, routes: updatedRoutes };
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

export const useComboStore = create<ComboState & ComboActions>()(
  persist(
    (set, get) => ({
      document: createEmptyDocument(),
      currentRouteId: null,
      selection: null,
      selectedCardIdForAdd: null,
      addNodeForm: createDefaultNodeFormData(),
      past: [],
      future: [],
      isNodeEditing: false,

      setNodeEditing: (editing) => set({ isNodeEditing: editing }),

      clearAll: async () => {
        const emptyDocument = createEmptyDocument();
        const initialRoute = createInitialRoute(emptyDocument.deck.name);
        skipHistory(() =>
          set({
            document: { ...emptyDocument, routes: [initialRoute] },
            currentRouteId: initialRoute.id,
            selection: null,
            selectedCardIdForAdd: null,
            addNodeForm: createDefaultNodeFormData(),
            past: [],
            future: [],
            isNodeEditing: false,
          }),
        );
        await clearAllCardImages();
      },

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

      addRoute: (name) => {
        const { document } = get();
        const routeName = name?.trim() || document.deck.name || '新規ルート';
        const newRoute = createInitialRoute(routeName);
        set((state) => ({
          document: { ...state.document, routes: [...state.document.routes, newRoute] },
          currentRouteId: newRoute.id,
          selection: null,
        }));
        return newRoute.id;
      },

      selectRoute: (id) => set({ currentRouteId: id, selection: null }),

      deleteRoute: (id) => {
        set((state) => {
          let routes = state.document.routes.filter((r) => r.id !== id);
          if (routes.length === 0) {
            routes = [createInitialRoute(state.document.deck.name || '新規ルート')];
          }
          const document = relayoutDocument({
            ...state.document,
            routes,
          });
          return {
            document,
            currentRouteId: document.routes[0]?.id ?? null,
            selection: null,
          };
        });
      },

      updateRoute: (id, updates) => {
        set((state) => ({
          document: updateDocumentRoute(state.document, id, (route) => ({ ...route, ...updates })),
        }));
      },

      addCardToCatalog: (card) => {
        const id = generateId('card_');
        set((state) => ({
          document: {
            ...state.document,
            cardCatalog: [...state.document.cardCatalog, { ...card, id }],
          },
        }));
        return id;
      },

      updateCardInCatalog: (id, updates) => {
        set((state) => ({
          document: {
            ...state.document,
            cardCatalog: state.document.cardCatalog.map((card) =>
              card.id === id ? { ...card, ...updates } : card,
            ),
          },
        }));
      },

      removeCardFromCatalog: (id) => {
        set((state) => ({
          document: {
            ...state.document,
            cardCatalog: state.document.cardCatalog.filter((c) => c.id !== id),
          },
        }));
      },

      addStepToEnd: (step) => {
        const { currentRouteId } = get();
        if (!currentRouteId) return '';

        const newStepId = generateId('step_');
        set((state) => {
          const route = state.document.routes.find((r) => r.id === currentRouteId);
          if (!route) return {};

          const newStep = { ...step, id: newStepId, position: { x: 0, y: 0 } } as Step;
          const updatedRoute = layoutRoute(addStepToRoute(route, newStep), state.document.routes);

          return {
            document: updateDocumentRoute(state.document, route.id, () => updatedRoute),
            selection: { type: 'step', id: newStepId },
          };
        });
        return newStepId;
      },

      addStepAtPosition: (step, position) => {
        const { currentRouteId } = get();
        if (!currentRouteId) return '';

        const newStepId = generateId('step_');
        set((state) => {
          const route = state.document.routes.find((r) => r.id === currentRouteId);
          if (!route) return {};

          const newStep = { ...step, id: newStepId, position } as Step;

          return {
            document: updateDocumentRoute(state.document, route.id, (r) => ({
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
          const route = findRouteByStepId(state.document.routes, afterStepId);
          if (!route) return {};

          const originalTargets = route.connections
            .filter((c) => c.source === afterStepId)
            .map((c) => c.target);
          const newStep = { ...step, id: newStepId, position: { x: 0, y: 0 } } as Step;

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

          const updatedRoute = layoutRoute(
            { ...route, steps: [...route.steps, newStep], connections: newConnections },
            state.document.routes,
          );

          return {
            document: updateDocumentRoute(state.document, route.id, () => updatedRoute),
            selection: { type: 'step', id: newStepId },
          };
        });
        return newStepId;
      },

      addBranch: (sourceStepId, step, label) => {
        const newStepId = generateId('step_');
        set((state) => {
          const route = findRouteByStepId(state.document.routes, sourceStepId);
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
            document: updateDocumentRoute(state.document, route.id, () => updatedRoute),
            selection: { type: 'connection', id: newConnection.id },
          };
        });
        return newStepId;
      },

      insertStepOnConnection: (connectionId, step) => {
        const newStepId = generateId('step_');
        set((state) => {
          const route = findRouteByConnectionId(state.document.routes, connectionId);
          if (!route) return {};

          const connection = route.connections.find((c) => c.id === connectionId);
          if (!connection) return {};

          const newStep = { ...step, id: newStepId, position: { x: 0, y: 0 } } as Step;
          const newConnections = [
            ...route.connections.filter((c) => c.id !== connectionId),
            { id: generateId('conn_'), source: connection.source, target: newStepId },
            { id: generateId('conn_'), source: newStepId, target: connection.target },
          ];

          const updatedRoute = layoutRoute(
            { ...route, steps: [...route.steps, newStep], connections: newConnections },
            state.document.routes,
          );

          return {
            document: updateDocumentRoute(state.document, route.id, () => updatedRoute),
            selection: { type: 'step', id: newStepId },
          };
        });
        return newStepId;
      },

      updateStep: (stepId, updates) => {
        set((state) => {
          const route = findRouteByStepId(state.document.routes, stepId);
          if (!route) return {};

          return {
            document: updateDocumentRoute(state.document, route.id, (r) =>
              updateRouteStep(r, stepId, (step) => applyStepUpdates(step, updates)),
            ),
          };
        });
      },

      updateStepPosition: (stepId, position) => {
        set((state) => {
          const route = findRouteByStepId(state.document.routes, stepId);
          if (!route) return {};

          return {
            document: updateDocumentRoute(state.document, route.id, (r) =>
              updateRouteStep(r, stepId, (step) => ({ ...step, position })),
            ),
          };
        });
      },

      deleteStep: (stepId) => {
        set((state) => {
          const route = findRouteByStepId(state.document.routes, stepId);
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

          let newSteps = route.steps.filter((s) => s.id !== stepId);
          if (newSteps.length > 0) {
            newSteps = layoutRoute(
              { ...route, steps: newSteps, connections: newConnections },
              state.document.routes,
            ).steps;
          }

          return {
            document: updateDocumentRoute(state.document, route.id, (r) => ({
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
          const route = findRouteByStepId(state.document.routes, connection.source);
          if (!route) return {};
          if (!route.steps.some((s) => s.id === connection.target)) return {};

          const exists = route.connections.some(
            (c) => c.source === connection.source && c.target === connection.target,
          );
          if (exists) return {};

          added = true;
          return {
            document: updateDocumentRoute(state.document, route.id, (r) => ({
              ...r,
              connections: [...r.connections, { ...connection, id }],
            })),
          };
        });
        return added ? id : '';
      },

      updateConnection: (id, updates) => {
        set((state) => {
          const route = findRouteByConnectionId(state.document.routes, id);
          if (!route) return {};

          return {
            document: updateDocumentRoute(state.document, route.id, (r) =>
              updateRouteConnection(r, id, (conn) => ({ ...conn, ...updates })),
            ),
          };
        });
      },

      updateConnectionEndpoints: (id, source, target) => {
        if (source === target) return;

        set((state) => {
          const route = findRouteByConnectionId(state.document.routes, id);
          if (!route) return {};

          if (!route.steps.some((s) => s.id === source) || !route.steps.some((s) => s.id === target)) {
            return {};
          }

          const exists = route.connections.some(
            (c) => c.id !== id && c.source === source && c.target === target,
          );
          if (exists) return {};

          return {
            document: updateDocumentRoute(state.document, route.id, (r) =>
              updateRouteConnection(r, id, (conn) => ({ ...conn, source, target })),
            ),
          };
        });
      },

      deleteConnection: (id) => {
        set((state) => {
          const route = findRouteByConnectionId(state.document.routes, id);
          if (!route) return {};

          const updatedRoute = layoutRoute(
            { ...route, connections: route.connections.filter((c) => c.id !== id) },
            state.document.routes,
          );

          return {
            document: updateDocumentRoute(state.document, route.id, () => updatedRoute),
            selection:
              state.selection?.type === 'connection' && state.selection.id === id
                ? null
                : state.selection,
          };
        });
      },

      importDocument: (doc) => {
        const validated = validateComboDocument(doc);
        const relayouted = relayoutDocument(validated);
        set({
          document: relayouted,
          currentRouteId: relayouted.routes[0]?.id ?? null,
          selection: null,
        });
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

        function findImageFile(
          srcBasename: string,
          fileMap: Map<string, File>,
        ): File | undefined {
          const normalized = normalizeFileName(srcBasename);
          const exact = fileMap.get(normalized);
          if (exact) return exact;

          // 拡張子が OS により異なる場合のフォールバック
          // 例: HTML 側が "...action.ダウンロード"、ファイル側が "...action"
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
            savePromises.push(saveCardImage(card.id, card.name, file));
          } else {
            // eslint-disable-next-line no-console
            console.warn(`[importNeuronHtml] 画像ファイルが見つかりません: ${basename}`);
          }
        }

        await Promise.all(savePromises);

        const relayouted = relayoutDocument(doc);
        set({
          document: relayouted,
          currentRouteId: relayouted.routes[0]?.id ?? null,
          selection: null,
        });
      },

      exportDocument: () => {
        return get().document;
      },

      updateDocument: (updates) => {
        set((state) => ({
          document: {
            ...state.document,
            ...updates,
            deck: updates.deck ? { ...state.document.deck, ...updates.deck } : state.document.deck,
          },
        }));
      },

      undo: () => {
        const { past, future, document } = get();
        if (past.length === 0) return;

        const previous = past[past.length - 1];
        set({
          document: previous,
          currentRouteId: previous.routes[0]?.id ?? null,
          selection: null,
          past: past.slice(0, -1),
          future: [...future, document],
        });
      },

      redo: () => {
        const { past, future, document } = get();
        if (future.length === 0) return;

        const next = future[future.length - 1];
        set({
          document: next,
          currentRouteId: next.routes[0]?.id ?? null,
          selection: null,
          past: [...past, document],
          future: future.slice(0, -1),
        });
      },

      canUndo: () => get().past.length > 0,
      canRedo: () => get().future.length > 0,
    }),
    {
      name: `duelflow-state-${location.pathname.replace(/\//g, '_')}`,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        document: state.document,
        currentRouteId: state.currentRouteId,
        // past/future は永続化しない（セッション中のみ有効）
      }),
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as { document?: any; currentRouteId?: string | null } | undefined;
        const document = state?.document ? { ...state.document, schemaVersion: 2 } : createEmptyDocument();
        if (document.routes) {
          document.routes = document.routes.map((route: any) => ({
            ...route,
            steps: route.steps.map((step: any) => {
              if (step.type !== 'action') return step;
              if (Array.isArray(step.actions)) return step;
              return { ...step, actions: step.action ? [step.action] : [] };
            }),
          }));
        }
        return { document, currentRouteId: state?.currentRouteId ?? null };
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        try {
          validateComboDocument(state.document);
        } catch (error) {
          console.warn('保存データの検証に失敗しました。初期状態に戻します。', error);
          return;
        }

        let document = state.document;
        let currentRouteId = state.currentRouteId;

        // ルートが1つもない場合は初期ルートを作成
        if (document.routes.length === 0) {
          const route = createInitialRoute(document.deck.name || '新規ルート');
          document = { ...document, routes: [route] };
          currentRouteId = route.id;
        }

        // 現在のルートIDが存在しなければ最初のルートを選択
        const routeExists = document.routes.some((r) => r.id === currentRouteId);
        if (!routeExists) {
          currentRouteId = document.routes[0]?.id ?? null;
        }

        // 全ルートのレイアウトを再計算（複数ルートのオフセットを反映）
        document = relayoutDocument(document);

        return { document, currentRouteId };
      },
    },
  ),
);

// History management
const MAX_HISTORY = 50;
let isRestoringHistory = false;
let isRecordingHistory = true;

export function skipHistory(fn: () => void) {
  isRecordingHistory = false;
  fn();
  isRecordingHistory = true;
}

function recordHistory(previousDocument: ComboDocument) {
  if (isRestoringHistory || !isRecordingHistory) return;

  useComboStore.setState((state) => ({
    past: [...state.past.slice(-(MAX_HISTORY - 1)), previousDocument],
    future: [],
  }));
}

useComboStore.subscribe((state, prevState) => {
  if (state.document !== prevState.document) {
    recordHistory(prevState.document);
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
