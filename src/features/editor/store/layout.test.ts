import { describe, expect, it } from 'vitest';
import { calculateLayout, getRouteOffset, NODE_HEIGHT, NODE_WIDTH } from './layout';
import type { Route } from '../../combo/model/types';

function createRoute(steps: Route['steps'], connections: Route['connections'] = []): Route {
  return {
    id: 'route_1',
    name: 'テスト',
    description: '',
    startingCardIds: [],
    steps,
    connections,
    result: { cardIds: [], description: '' },
  };
}

describe('getRouteOffset', () => {
  it('インデックスに応じたオフセットを返す', () => {
    expect(getRouteOffset(0)).toEqual({ x: 0, y: 60 });
    expect(getRouteOffset(1)).toEqual({ x: 400, y: 60 });
    expect(getRouteOffset(2)).toEqual({ x: 800, y: 60 });
  });

  it('負のインデックスは 0 として扱う', () => {
    expect(getRouteOffset(-1)).toEqual({ x: 0, y: 60 });
  });
});

describe('calculateLayout', () => {
  it('空のルートはデフォルトの bounds を返す', () => {
    const route = createRoute([]);
    const layout = calculateLayout(route, 0, 60);
    expect(layout.steps).toEqual([]);
    expect(layout.bounds.minX).toBe(0);
    expect(layout.bounds.minY).toBe(60);
  });

  it('単一ステップの位置を計算する', () => {
    const route = createRoute([
      { id: 'step_1', type: 'action', actions: ['draw'], cardId: 'c1', relatedCards: [], position: { x: 0, y: 0 } },
    ]);
    const layout = calculateLayout(route);
    expect(layout.steps).toHaveLength(1);
    expect(layout.steps[0].position.x).toBeDefined();
    expect(layout.steps[0].position.y).toBeDefined();
  });

  it('接続に応じて depth を計算する', () => {
    const route = createRoute(
      [
        { id: 'step_1', type: 'action', actions: ['draw'], cardId: 'c1', relatedCards: [], position: { x: 0, y: 0 } },
        { id: 'step_2', type: 'action', actions: ['summon'], cardId: 'c2', relatedCards: [], position: { x: 0, y: 0 } },
      ],
      [{ id: 'conn_1', source: 'step_1', target: 'step_2' }],
    );
    const layout = calculateLayout(route);
    const step1Y = layout.steps.find((s) => s.id === 'step_1')!.position.y;
    const step2Y = layout.steps.find((s) => s.id === 'step_2')!.position.y;
    expect(step2Y).toBeGreaterThan(step1Y);
  });

  it('オフセットを反映する', () => {
    const route = createRoute([
      { id: 'step_1', type: 'note', description: 'メモ', position: { x: 0, y: 0 } },
    ]);
    const layout = calculateLayout(route, 100, 200);
    expect(layout.steps[0].position.x).toBeGreaterThanOrEqual(100 - NODE_WIDTH / 2);
    expect(layout.steps[0].position.y).toBe(200);
  });

  it('bounds にノードサイズを含む', () => {
    const route = createRoute([
      { id: 'step_1', type: 'note', description: 'メモ', position: { x: 0, y: 0 } },
    ]);
    const layout = calculateLayout(route, 0, 0);
    expect(layout.bounds.maxX - layout.bounds.minX).toBeGreaterThanOrEqual(NODE_WIDTH);
    expect(layout.bounds.maxY - layout.bounds.minY).toBeGreaterThanOrEqual(NODE_HEIGHT);
  });
});
