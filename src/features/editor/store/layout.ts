import type { Connection, Route, Step } from '../../combo/model/types';

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 80;
const ROUTE_SPACING = 400;
const ROUTE_OFFSET_Y = 60;

const LAYER_HEIGHT = 120;
const NODE_HORIZONTAL_GAP = 40;

type LayoutResult = {
  steps: Step[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
};

export function getRouteOffset(index: number): { x: number; y: number } {
  return { x: Math.max(index, 0) * ROUTE_SPACING, y: ROUTE_OFFSET_Y };
}

function buildAdjacencyLists(steps: Step[], connections: Connection[]) {
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();

  for (const step of steps) {
    incoming.set(step.id, []);
    outgoing.set(step.id, []);
  }

  for (const connection of connections) {
    outgoing.get(connection.source)?.push(connection.target);
    incoming.get(connection.target)?.push(connection.source);
  }

  return { incoming, outgoing };
}

function computeDepths(steps: Step[], connections: Connection[]): Map<string, number> {
  if (steps.length === 0) {
    return new Map();
  }

  const { incoming, outgoing } = buildAdjacencyLists(steps, connections);
  const depths = new Map<string, number>();
  const inDegree = new Map<string, number>();
  const queue: string[] = [];

  for (const step of steps) {
    const degree = incoming.get(step.id)?.length ?? 0;
    inDegree.set(step.id, degree);
    if (degree === 0) {
      depths.set(step.id, 0);
      queue.push(step.id);
    }
  }

  while (queue.length > 0) {
    const id = queue.shift()!;
    const depth = depths.get(id) ?? 0;

    for (const child of outgoing.get(id) ?? []) {
      const currentChildDepth = depths.get(child) ?? -1;
      depths.set(child, Math.max(currentChildDepth, depth + 1));

      const remaining = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, remaining);
      if (remaining === 0) {
        queue.push(child);
      }
    }
  }

  // Fallback for cycles or disconnected nodes
  for (const step of steps) {
    if (!depths.has(step.id)) {
      depths.set(step.id, 0);
    }
  }

  return depths;
}

function groupStepsByDepth(steps: Step[], depths: Map<string, number>): Map<number, string[]> {
  const layers = new Map<number, string[]>();

  for (const step of steps) {
    const depth = depths.get(step.id) ?? 0;
    if (!layers.has(depth)) {
      layers.set(depth, []);
    }
    layers.get(depth)!.push(step.id);
  }

  return layers;
}

function computePositions(
  layers: Map<number, string[]>,
  offsetX: number,
  offsetY: number,
): {
  positions: Map<string, { x: number; y: number }>;
  bounds: LayoutResult['bounds'];
} {
  const positions = new Map<string, { x: number; y: number }>();
  const sortedDepths = Array.from(layers.keys()).sort((a, b) => a - b);

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const depth of sortedDepths) {
    const layer = layers.get(depth)!;
    const layerWidth = layer.length * NODE_WIDTH + Math.max(0, layer.length - 1) * NODE_HORIZONTAL_GAP;
    const startX = -layerWidth / 2;

    for (let i = 0; i < layer.length; i++) {
      const id = layer[i];
      const x = startX + i * (NODE_WIDTH + NODE_HORIZONTAL_GAP) + offsetX;
      const y = depth * LAYER_HEIGHT + offsetY;

      positions.set(id, { x, y });
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + NODE_WIDTH);
      maxY = Math.max(maxY, y + NODE_HEIGHT);
    }
  }

  return {
    positions,
    bounds: { minX, minY, maxX, maxY },
  };
}

export function calculateLayout(route: Route, offsetX = 0, offsetY = 0): LayoutResult {
  if (route.steps.length === 0) {
    return {
      steps: [],
      bounds: {
        minX: offsetX,
        minY: offsetY,
        maxX: offsetX + NODE_WIDTH,
        maxY: offsetY + NODE_HEIGHT,
      },
    };
  }

  const depths = computeDepths(route.steps, route.connections);
  const layers = groupStepsByDepth(route.steps, depths);
  const { positions, bounds } = computePositions(layers, offsetX, offsetY);

  return {
    steps: route.steps.map((step) => ({
      ...step,
      position: positions.get(step.id) ?? step.position,
    })),
    bounds,
  };
}
