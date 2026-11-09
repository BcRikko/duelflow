import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultNodeFormData } from '../model/form';
import {
  findRouteByConnectionId,
  findRouteByStepId,
  performRedo,
  performUndo,
  relayoutDocument,
  useComboStore,
} from './comboStore';

function createEmptyDoc() {
  return {
    schemaVersion: 2,
    deck: { id: 'deck_1', name: 'Test', source: { type: 'neuron' as const, deckCode: '' }, cards: [] },
    cardCatalog: [],
    routes: [],
  };
}

beforeEach(() => {
  useComboStore.setState({
    document: createEmptyDoc(),
    currentRouteId: null,
    selection: null,
    selectedCardIdForAdd: null,
    addNodeForm: createDefaultNodeFormData(),
    past: [],
    future: [],
  });
});

function addRouteAndSelect() {
  const id = useComboStore.getState().addRoute('Route1');
  useComboStore.getState().selectRoute(id);
  return id;
}

function addTestCard(name = 'TestCard') {
  return useComboStore.getState().addCardToCatalog({ name, imageUrl: '', type: 'monster' });
}

describe('ルート管理', () => {
  it('ルートを追加する', () => {
    const id = useComboStore.getState().addRoute();
    const routes = useComboStore.getState().document.routes;
    expect(routes).toHaveLength(1);
    expect(useComboStore.getState().currentRouteId).toBe(id);
  });

  it('ルート名を指定して追加する', () => {
    useComboStore.getState().addRoute('初動ルート');
    expect(useComboStore.getState().document.routes[0].name).toBe('初動ルート');
  });

  it('ルートを選択する', () => {
    const id = addRouteAndSelect();
    expect(useComboStore.getState().currentRouteId).toBe(id);
  });

  it('ルートを削除する', () => {
    const id = addRouteAndSelect();
    useComboStore.getState().deleteRoute(id);
    expect(useComboStore.getState().document.routes).toHaveLength(0);
    expect(useComboStore.getState().currentRouteId).toBeNull();
  });

  it('ルート情報を更新する', () => {
    const id = addRouteAndSelect();
    useComboStore.getState().updateRoute(id, { name: 'Updated' });
    expect(useComboStore.getState().document.routes[0].name).toBe('Updated');
  });
});

describe('カードカタログ', () => {
  it('カードを追加する', () => {
    const id = addTestCard();
    expect(useComboStore.getState().document.cardCatalog).toHaveLength(1);
    expect(useComboStore.getState().document.cardCatalog[0].id).toBe(id);
  });

  it('カードを更新する', () => {
    const id = addTestCard();
    useComboStore.getState().updateCardInCatalog(id, { name: 'Updated' });
    expect(useComboStore.getState().document.cardCatalog[0].name).toBe('Updated');
  });

  it('カードを削除する', () => {
    const id = addTestCard();
    useComboStore.getState().removeCardFromCatalog(id);
    expect(useComboStore.getState().document.cardCatalog).toHaveLength(0);
  });
});

describe('ステップ管理', () => {
  it('ルート末尾にステップを追加する', () => {
    addRouteAndSelect();
    const cardId = addTestCard();
    const stepId = useComboStore.getState().addStepToEnd({
      type: 'action',
      actions: ['normalSummon'],
      cardId,
      relatedCards: [],
    });
    const route = useComboStore.getState().document.routes[0];
    expect(route.steps).toHaveLength(1);
    expect(route.steps[0].id).toBe(stepId);
  });

  it('指定位置にステップを追加する', () => {
    addRouteAndSelect();
    const cardId = addTestCard();
    const stepId = useComboStore.getState().addStepAtPosition(
      { type: 'action', actions: ['draw'], cardId, relatedCards: [] },
      { x: 100, y: 200 },
    );
    const step = useComboStore.getState().document.routes[0].steps[0];
    expect(step.id).toBe(stepId);
    expect(step.position).toEqual({ x: 100, y: 200 });
  });

  it('指定位置追加時は自動接続しない', () => {
    addRouteAndSelect();
    const cardId = addTestCard();
    useComboStore.getState().addStepAtPosition(
      { type: 'action', actions: ['normalSummon'], cardId, relatedCards: [] },
      { x: 0, y: 0 },
    );
    useComboStore.getState().addStepAtPosition(
      { type: 'action', actions: ['draw'], cardId, relatedCards: [] },
      { x: 100, y: 0 },
    );
    expect(useComboStore.getState().document.routes[0].connections).toHaveLength(0);
  });

  it('ステップを追加すると既存の末端から接続される', () => {
    addRouteAndSelect();
    const cardId = addTestCard();
    const firstId = useComboStore.getState().addStepToEnd({
      type: 'action',
      actions: ['normalSummon'],
      cardId,
      relatedCards: [],
    });
    const secondId = useComboStore.getState().addStepToEnd({
      type: 'action',
      actions: ['draw'],
      cardId,
      relatedCards: [],
    });
    const route = useComboStore.getState().document.routes[0];
    expect(route.connections.some((c) => c.source === firstId && c.target === secondId)).toBe(true);
  });

  it('指定ステップの後にステップを追加する', () => {
    addRouteAndSelect();
    const cardId = addTestCard();
    const stepId1 = useComboStore.getState().addStepToEnd({
      type: 'action',
      actions: ['normalSummon'],
      cardId,
      relatedCards: [],
    });
    const stepId2 = useComboStore.getState().addStepAfter(stepId1, {
      type: 'action',
      actions: ['draw'],
      cardId,
      relatedCards: [],
    });
    const route = useComboStore.getState().document.routes[0];
    expect(route.connections.some((c) => c.source === stepId1 && c.target === stepId2)).toBe(true);
  });

  it('分岐を追加する', () => {
    addRouteAndSelect();
    const cardId = addTestCard();
    const sourceId = useComboStore.getState().addStepToEnd({
      type: 'action',
      actions: ['normalSummon'],
      cardId,
      relatedCards: [],
    });
    const branchId = useComboStore.getState().addBranch(
      sourceId,
      { type: 'action', actions: ['effect'], cardId, relatedCards: [] },
      '分岐1',
    );
    const route = useComboStore.getState().document.routes[0];
    expect(route.steps.some((s) => s.id === branchId)).toBe(true);
    expect(route.connections.some((c) => c.source === sourceId && c.target === branchId)).toBe(true);
  });

  it('接続線上にステップを挿入する', () => {
    addRouteAndSelect();
    const cardId = addTestCard();
    useComboStore.getState().addStepToEnd({
      type: 'action',
      actions: ['normalSummon'],
      cardId,
      relatedCards: [],
    });
    useComboStore.getState().addStepToEnd({
      type: 'action',
      actions: ['draw'],
      cardId,
      relatedCards: [],
    });
    const connection = useComboStore.getState().document.routes[0].connections[0];
    const insertedId = useComboStore.getState().insertStepOnConnection(connection.id, {
      type: 'action',
      actions: ['effect'],
      cardId,
      relatedCards: [],
    });
    const route = useComboStore.getState().document.routes[0];
    expect(route.steps.some((s) => s.id === insertedId)).toBe(true);
  });

  it('ステップを更新する', () => {
    addRouteAndSelect();
    const cardId = addTestCard();
    const stepId = useComboStore.getState().addStepToEnd({
      type: 'action',
      actions: ['normalSummon'],
      cardId,
      relatedCards: [],
    });
    useComboStore.getState().updateStep(stepId, { actions: ['draw'] });
    const step = useComboStore.getState().document.routes[0].steps[0];
    expect(step.actions).toEqual(['draw']);
  });

  it('空の説明もそのまま更新する', () => {
    addRouteAndSelect();
    const cardId = addTestCard();
    const stepId = useComboStore.getState().addStepToEnd({
      type: 'action',
      actions: ['normalSummon'],
      cardId,
      relatedCards: [],
      description: '説明',
    });
    useComboStore.getState().updateStep(stepId, { description: '' });
    const step = useComboStore.getState().document.routes[0].steps[0];
    expect(step.description).toBe('');
  });

  it('ステップ位置を更新する', () => {
    addRouteAndSelect();
    const cardId = addTestCard();
    const stepId = useComboStore.getState().addStepToEnd({
      type: 'action',
      actions: ['normalSummon'],
      cardId,
      relatedCards: [],
    });
    useComboStore.getState().updateStepPosition(stepId, { x: 999, y: 888 });
    const step = useComboStore.getState().document.routes[0].steps[0];
    expect(step.position).toEqual({ x: 999, y: 888 });
  });

  it('ステップを削除する', () => {
    addRouteAndSelect();
    const cardId = addTestCard();
    const stepId = useComboStore.getState().addStepToEnd({
      type: 'action',
      actions: ['normalSummon'],
      cardId,
      relatedCards: [],
    });
    useComboStore.getState().deleteStep(stepId);
    expect(useComboStore.getState().document.routes[0].steps).toHaveLength(0);
  });
});

describe('接続線管理', () => {
  it('接続線を追加する', () => {
    addRouteAndSelect();
    const route = useComboStore.getState().document.routes[0];
    route.steps.push(
      { id: 'step_1', type: 'action', actions: ['normalSummon'], cardId: 'card_1', relatedCards: [], position: { x: 0, y: 0 } },
      { id: 'step_2', type: 'action', actions: ['draw'], cardId: 'card_1', relatedCards: [], position: { x: 100, y: 0 } },
    );
    const connectionId = useComboStore.getState().addConnection({
      source: 'step_1',
      target: 'step_2',
    });
    expect(connectionId).not.toBe('');
    expect(useComboStore.getState().document.routes[0].connections.some((c) => c.id === connectionId)).toBe(true);
  });

  it('接続線追加時にNodeの位置は変わらない', () => {
    addRouteAndSelect();
    const route = useComboStore.getState().document.routes[0];
    route.steps.push(
      { id: 'step_1', type: 'action', actions: ['normalSummon'], cardId: 'card_1', relatedCards: [], position: { x: 10, y: 20 } },
      { id: 'step_2', type: 'action', actions: ['draw'], cardId: 'card_1', relatedCards: [], position: { x: 110, y: 120 } },
    );
    useComboStore.getState().addConnection({ source: 'step_1', target: 'step_2' });
    const steps = useComboStore.getState().document.routes[0].steps;
    expect(steps[0].position).toEqual({ x: 10, y: 20 });
    expect(steps[1].position).toEqual({ x: 110, y: 120 });
  });

  it('自己接続は追加しない', () => {
    addRouteAndSelect();
    const cardId = addTestCard();
    const stepId = useComboStore.getState().addStepToEnd({
      type: 'action',
      actions: ['normalSummon'],
      cardId,
      relatedCards: [],
    });
    const id = useComboStore.getState().addConnection({ source: stepId, target: stepId });
    expect(id).toBe('');
  });

  it('重複接続は追加しない', () => {
    addRouteAndSelect();
    const route = useComboStore.getState().document.routes[0];
    route.steps.push(
      { id: 'step_1', type: 'action', actions: ['normalSummon'], cardId: 'card_1', relatedCards: [], position: { x: 0, y: 0 } },
      { id: 'step_2', type: 'action', actions: ['draw'], cardId: 'card_1', relatedCards: [], position: { x: 100, y: 0 } },
    );
    const firstId = useComboStore.getState().addConnection({ source: 'step_1', target: 'step_2' });
    expect(firstId).not.toBe('');
    const id = useComboStore.getState().addConnection({ source: 'step_1', target: 'step_2' });
    expect(id).toBe('');
  });

  it('接続線を削除する', () => {
    addRouteAndSelect();
    const cardId = addTestCard();
    const stepId1 = useComboStore.getState().addStepToEnd({
      type: 'action',
      actions: ['normalSummon'],
      cardId,
      relatedCards: [],
    });
    const stepId2 = useComboStore.getState().addStepToEnd({
      type: 'action',
      actions: ['draw'],
      cardId,
      relatedCards: [],
    });
    const connectionId = useComboStore.getState().addConnection({
      source: stepId1,
      target: stepId2,
    });
    useComboStore.getState().deleteConnection(connectionId);
    const route = useComboStore.getState().document.routes[0];
    expect(route.connections.some((c) => c.id === connectionId)).toBe(false);
  });
});

describe('ドキュメント入出力', () => {
  it('ドキュメントをエクスポートする', () => {
    addRouteAndSelect();
    const doc = useComboStore.getState().exportDocument();
    expect(doc.routes).toHaveLength(1);
  });

  it('ドキュメントをインポートする', () => {
    const doc = createEmptyDoc();
    doc.routes.push({
      id: 'route_imported',
      name: 'Imported',
      description: '',
      startingCardIds: [],
      steps: [],
      connections: [],
      result: { cardIds: [], description: '' },
    });
    useComboStore.getState().importDocument(doc);
    expect(useComboStore.getState().document.routes).toHaveLength(1);
    expect(useComboStore.getState().currentRouteId).toBe('route_imported');
  });

  it('無効なドキュメントはインポートエラーになる', () => {
    const doc = { invalid: true };
    expect(() => useComboStore.getState().importDocument(doc as never)).toThrow();
  });

  it('デッキ名を更新する', () => {
    useComboStore.getState().updateDocument({ deck: { ...createEmptyDoc().deck, name: 'New' } });
    expect(useComboStore.getState().document.deck.name).toBe('New');
  });
});

describe('履歴', () => {
  it('Undo で直前の状態に戻る', () => {
    addRouteAndSelect();
    expect(useComboStore.getState().canUndo()).toBe(true);
    performUndo();
    expect(useComboStore.getState().document.routes).toHaveLength(0);
    expect(useComboStore.getState().canRedo()).toBe(true);
  });

  it('Redo で元に戻す', () => {
    addRouteAndSelect();
    performUndo();
    performRedo();
    expect(useComboStore.getState().document.routes).toHaveLength(1);
  });

  it('新しい変更を加えると future がクリアされる', () => {
    addRouteAndSelect();
    performUndo();
    expect(useComboStore.getState().canRedo()).toBe(true);
    useComboStore.getState().addRoute();
    expect(useComboStore.getState().canRedo()).toBe(false);
  });
});

describe('ヘルパー関数', () => {
  it('findRouteByStepId でステップが属するルートを探す', () => {
    addRouteAndSelect();
    const cardId = addTestCard();
    const stepId = useComboStore.getState().addStepToEnd({
      type: 'action',
      actions: ['normalSummon'],
      cardId,
      relatedCards: [],
    });
    const route = findRouteByStepId(useComboStore.getState().document.routes, stepId);
    expect(route).toBeDefined();
    expect(route?.steps.some((s) => s.id === stepId)).toBe(true);
  });

  it('findRouteByConnectionId で接続線が属するルートを探す', () => {
    addRouteAndSelect();
    const route = useComboStore.getState().document.routes[0];
    route.steps.push(
      { id: 'step_1', type: 'action', actions: ['normalSummon'], cardId: 'card_1', relatedCards: [], position: { x: 0, y: 0 } },
      { id: 'step_2', type: 'action', actions: ['draw'], cardId: 'card_1', relatedCards: [], position: { x: 100, y: 0 } },
    );
    const connectionId = useComboStore.getState().addConnection({
      source: 'step_1',
      target: 'step_2',
    });
    expect(connectionId).not.toBe('');
    const foundRoute = findRouteByConnectionId(useComboStore.getState().document.routes, connectionId);
    expect(foundRoute).toBeDefined();
  });

  it('relayoutDocument で全ルートのレイアウトを再計算する', () => {
    const doc = createEmptyDoc();
    doc.routes.push({
      id: 'route_1',
      name: 'R1',
      description: '',
      startingCardIds: [],
      steps: [{ id: 'step_1', type: 'note', description: 'メモ', position: { x: 0, y: 0 } }],
      connections: [],
      result: { cardIds: [], description: '' },
    });
    const relayouted = relayoutDocument(doc);
    expect(relayouted.routes[0].steps[0].position.x).not.toBe(0);
  });
});
