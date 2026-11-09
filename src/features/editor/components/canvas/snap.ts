import type { Node } from '@xyflow/react';

const SNAP_THRESHOLD = 10;
const DEFAULT_NODE_WIDTH = 200;
const DEFAULT_NODE_HEIGHT = 80;

type SnapResult = {
  x: number;
  y: number;
  snapped: boolean;
};

function getNodeBounds(node: Node) {
  const width = node.width ?? DEFAULT_NODE_WIDTH;
  const height = node.height ?? DEFAULT_NODE_HEIGHT;
  return {
    left: node.position.x,
    centerX: node.position.x + width / 2,
    right: node.position.x + width,
    top: node.position.y,
    centerY: node.position.y + height / 2,
    bottom: node.position.y + height,
  };
}

export function getSnapPosition(node: Node, otherNodes: Node[]): SnapResult {
  const nodeBounds = getNodeBounds(node);

  let offsetX = 0;
  let offsetY = 0;
  let snappedX = false;
  let snappedY = false;

  for (const other of otherNodes) {
    if (other.id === node.id) continue;

    const otherBounds = getNodeBounds(other);

    const xAlignments = [
      { source: nodeBounds.left, target: otherBounds.left },
      { source: nodeBounds.centerX, target: otherBounds.centerX },
      { source: nodeBounds.right, target: otherBounds.right },
      { source: nodeBounds.left, target: otherBounds.right },
      { source: nodeBounds.right, target: otherBounds.left },
    ];

    for (const { source, target } of xAlignments) {
      const diff = target - source;
      if (Math.abs(diff) <= SNAP_THRESHOLD && (!snappedX || Math.abs(diff) < Math.abs(offsetX))) {
        offsetX = diff;
        snappedX = true;
      }
    }

    const yAlignments = [
      { source: nodeBounds.top, target: otherBounds.top },
      { source: nodeBounds.centerY, target: otherBounds.centerY },
      { source: nodeBounds.bottom, target: otherBounds.bottom },
      { source: nodeBounds.top, target: otherBounds.bottom },
      { source: nodeBounds.bottom, target: otherBounds.top },
    ];

    for (const { source, target } of yAlignments) {
      const diff = target - source;
      if (Math.abs(diff) <= SNAP_THRESHOLD && (!snappedY || Math.abs(diff) < Math.abs(offsetY))) {
        offsetY = diff;
        snappedY = true;
      }
    }
  }

  return {
    x: node.position.x + offsetX,
    y: node.position.y + offsetY,
    snapped: snappedX || snappedY,
  };
}
