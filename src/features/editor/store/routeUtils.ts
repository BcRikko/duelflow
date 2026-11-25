import { generateId } from '../../../shared/id';
import { migrateStepCardRole } from '../../combo/model/schema';
import type { ActionStep, Connection, NoteStep, Route, Step } from '../../combo/model/types';
import type { DeckRecord } from '../../../shared/cardDatabase';
import { calculateLayout, getRouteOffset } from './layout';

export function createInitialRoute(name = '新規ルート'): Route {
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

export function createEmptyDeck(name = '新規デッキ'): DeckRecord {
  return {
    deckId: generateId('deck_'),
    name,
    source: { type: 'neuron', deckCode: '' },
    cards: [],
    route: createInitialRoute(name),
  };
}

export function toRouteArray(route: Route | Route[]): Route[] {
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

export function updateCurrentRoute(deck: DeckRecord, updater: (route: Route) => Route): DeckRecord {
  return { ...deck, route: updater(deck.route) };
}

export function updateRouteStep(route: Route, stepId: string, updater: (step: Step) => Step): Route {
  return {
    ...route,
    steps: route.steps.map((step) => (step.id === stepId ? updater(step) : step)),
  };
}

export function removeStepFromRoute(route: Route, stepId: string): Route {
  const incoming = route.connections.filter((c) => c.target === stepId);
  const outgoing = route.connections.filter((c) => c.source === stepId);

  let newConnections = route.connections.filter(
    (c) => c.source !== stepId && c.target !== stepId,
  );
  const existingConnections = new Set(newConnections.map((c) => `${c.source}->${c.target}`));
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

  return {
    ...route,
    steps: route.steps.filter((s) => s.id !== stepId),
    connections: newConnections,
  };
}

export function updateRouteConnection(
  route: Route,
  connectionId: string,
  updater: (conn: Connection) => Connection,
): Route {
  return {
    ...route,
    connections: route.connections.map((conn) =>
      conn.id === connectionId ? updater(conn) : conn,
    ),
  };
}

export function applyStepUpdates(
  step: Step,
  updates: Partial<Omit<Step, 'id' | 'type' | 'position'>>,
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

export function addStepToRoute(route: Route, newStep: Step): Route {
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

export function migrateRouteRoles(route: Route): Route {
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

export function relayoutDeck(deck: DeckRecord): DeckRecord {
  const offset = getRouteOffset(0);
  const layout = calculateLayout(deck.route, offset.x, offset.y);
  return { ...deck, route: { ...deck.route, steps: layout.steps } };
}
