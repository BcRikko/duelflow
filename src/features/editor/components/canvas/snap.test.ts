import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/react';
import { getSnapPosition } from './snap';

function createNode(id: string, x: number, y: number, width = 200, height = 80): Node {
  return { id, type: 'default', position: { x, y }, data: {}, width, height };
}

describe('getSnapPosition', () => {
  it('スナップ対象がない場合は元の位置を返す', () => {
    const node = createNode('a', 100, 100);
    const result = getSnapPosition(node, []);
    expect(result.x).toBe(100);
    expect(result.y).toBe(100);
    expect(result.snapped).toBe(false);
  });

  it('しきい値内で左端が揃うようにスナップする', () => {
    const node = createNode('a', 8, 100);
    const other = createNode('b', 0, 0);
    const result = getSnapPosition(node, [other]);
    expect(result.x).toBe(0);
    expect(result.y).toBe(100);
    expect(result.snapped).toBe(true);
  });

  it('しきい値内で右端が揃うようにスナップする', () => {
    const node = createNode('a', 105, 100, 100);
    const other = createNode('b', 0, 0);
    const result = getSnapPosition(node, [other]);
    expect(result.x).toBe(100);
    expect(result.y).toBe(100);
  });

  it('しきい値内で上端が揃うようにスナップする', () => {
    const node = createNode('a', 100, 6);
    const other = createNode('b', 0, 0);
    const result = getSnapPosition(node, [other]);
    expect(result.x).toBe(100);
    expect(result.y).toBe(0);
  });

  it('しきい値内で下端が揃うようにスナップする', () => {
    const node = createNode('a', 100, 35, 200, 50);
    const other = createNode('b', 0, 0);
    const result = getSnapPosition(node, [other]);
    expect(result.x).toBe(100);
    expect(result.y).toBe(30);
  });

  it('しきい値を超える場合はスナップしない', () => {
    const node = createNode('a', 30, 100);
    const other = createNode('b', 0, 0);
    const result = getSnapPosition(node, [other]);
    expect(result.x).toBe(30);
    expect(result.snapped).toBe(false);
  });

  it('中央も揃えられる', () => {
    const node = createNode('a', 55, 100, 100);
    const other = createNode('b', 0, 0);
    const result = getSnapPosition(node, [other]);
    expect(result.x).toBe(50);
    expect(result.y).toBe(100);
  });
});
