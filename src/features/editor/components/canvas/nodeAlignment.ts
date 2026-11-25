type AlignableNode = {
  id: string;
  position: { x: number; y: number };
  width: number;
  height: number;
};

const DEFAULT_NODE_WIDTH = 240;
const DEFAULT_NODE_HEIGHT = 80;

function getRect(node: AlignableNode) {
  const width = node.width || DEFAULT_NODE_WIDTH;
  const height = node.height || DEFAULT_NODE_HEIGHT;
  return {
    left: node.position.x,
    right: node.position.x + width,
    top: node.position.y,
    bottom: node.position.y + height,
    centerX: node.position.x + width / 2,
    centerY: node.position.y + height / 2,
    width,
    height,
  };
}

export function alignCenterX(nodes: AlignableNode[]): Map<string, { x: number; y: number }> {
  if (nodes.length < 2) return new Map();

  const rects = nodes.map(getRect);
  const minLeft = Math.min(...rects.map((r) => r.left));
  const maxRight = Math.max(...rects.map((r) => r.right));
  const targetCenterX = (minLeft + maxRight) / 2;

  const result = new Map<string, { x: number; y: number }>();
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const rect = rects[i]!;
    result.set(node.id, {
      x: targetCenterX - rect.width / 2,
      y: node.position.y,
    });
  }
  return result;
}

export function alignCenterY(nodes: AlignableNode[]): Map<string, { x: number; y: number }> {
  if (nodes.length < 2) return new Map();

  const rects = nodes.map(getRect);
  const minTop = Math.min(...rects.map((r) => r.top));
  const maxBottom = Math.max(...rects.map((r) => r.bottom));
  const targetCenterY = (minTop + maxBottom) / 2;

  const result = new Map<string, { x: number; y: number }>();
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]!;
    const rect = rects[i]!;
    result.set(node.id, {
      x: node.position.x,
      y: targetCenterY - rect.height / 2,
    });
  }
  return result;
}

export function distributeHorizontally(nodes: AlignableNode[]): Map<string, { x: number; y: number }> {
  if (nodes.length < 3) return new Map();

  const sorted = [...nodes].sort((a, b) => a.position.x - b.position.x);
  const rects = sorted.map(getRect);
  const first = rects[0]!;
  const last = rects[rects.length - 1]!;
  const totalSpan = last.right - first.left;
  const totalWidth = rects.reduce((sum, r) => sum + r.width, 0);
  const gap = (totalSpan - totalWidth) / (sorted.length - 1);

  const result = new Map<string, { x: number; y: number }>();
  let currentLeft = first.left;
  for (let i = 0; i < sorted.length; i++) {
    const node = sorted[i]!;
    const rect = rects[i]!;
    result.set(node.id, { x: currentLeft, y: node.position.y });
    currentLeft += rect.width + gap;
  }
  return result;
}

export function distributeVertically(nodes: AlignableNode[]): Map<string, { x: number; y: number }> {
  if (nodes.length < 3) return new Map();

  const sorted = [...nodes].sort((a, b) => a.position.y - b.position.y);
  const rects = sorted.map(getRect);
  const first = rects[0]!;
  const last = rects[rects.length - 1]!;
  const totalSpan = last.bottom - first.top;
  const totalHeight = rects.reduce((sum, r) => sum + r.height, 0);
  const gap = (totalSpan - totalHeight) / (sorted.length - 1);

  const result = new Map<string, { x: number; y: number }>();
  let currentTop = first.top;
  for (let i = 0; i < sorted.length; i++) {
    const node = sorted[i]!;
    const rect = rects[i]!;
    result.set(node.id, { x: node.position.x, y: currentTop });
    currentTop += rect.height + gap;
  }
  return result;
}
