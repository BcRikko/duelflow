import { beforeEach, describe, expect, it } from 'vitest';
import { getCard } from '../../../shared/cardDatabase';
import { resetStore } from '../../../test/helpers';
import {
  findRouteByConnectionId,
  findRouteByStepId,
  performRedo,
  performUndo,
  relayoutDeck,
  useComboStore,
} from './comboStore';

function createJpegFile(name: string): File {
  const content = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  return new File([content], name);
}

beforeEach(() => {
  resetStore();
});

async function addTestCard(name = 'TestCard') {
  return useComboStore.getState().addCardToCatalog({ name, imageUrl: '', type: 'monster' });
}

function getCurrentRoute() {
  const { currentDeck } = useComboStore.getState();
  if (!currentDeck) throw new Error('currentDeck is null');
  return currentDeck.routes.find((r) => r.id === currentDeck.currentRouteId) ?? currentDeck.routes[0];
}

function addRouteAndSelect() {
  const id = useComboStore.getState().addRoute('Route1');
  useComboStore.getState().selectRoute(id);
  return id;
}

describe('ルート管理', () => {
  it('ルートを追加する', () => {
    const id = useComboStore.getState().addRoute();
    expect(useComboStore.getState().currentDeck?.routes).toHaveLength(2);
    expect(useComboStore.getState().currentDeck?.currentRouteId).toBe(id);
  });

  it('ルート名を指定して追加する', () => {
    useComboStore.getState().addRoute('初動ルート');
    expect(getCurrentRoute()?.name).toBe('初動ルート');
  });

  it('ルートを選択する', () => {
    const id = addRouteAndSelect();
    expect(useComboStore.getState().currentDeck?.currentRouteId).toBe(id);
  });

  it('ルートを削除する', () => {
    const id = addRouteAndSelect();
    useComboStore.getState().deleteRoute(id);
    // 最後のルートを削除しても、空のキャンバスを防ぐため新規ルートが作成される
    expect(useComboStore.getState().currentDeck?.routes).toHaveLength(1);
    expect(useComboStore.getState().currentDeck?.routes[0].name).toBe('Test Deck');
    expect(useComboStore.getState().currentDeck?.currentRouteId).not.toBeNull();
  });

  it('ルート情報を更新する', () => {
    const id = addRouteAndSelect();
    useComboStore.getState().updateRoute(id, { name: 'Updated' });
    expect(getCurrentRoute()?.name).toBe('Updated');
  });
});

describe('カードカタログ', () => {
  it('カードを追加する', async () => {
    const id = await addTestCard();
    expect(useComboStore.getState().cards).toHaveLength(1);
    expect(useComboStore.getState().cards[0].id).toBe(id);
  });

  it('カードを更新する', async () => {
    const id = await addTestCard();
    await useComboStore.getState().updateCardInCatalog(id, { name: 'Updated' });
    expect(useComboStore.getState().cards[0].name).toBe('Updated');
  });

  it('カードを削除する', async () => {
    const id = await addTestCard();
    await useComboStore.getState().removeCardFromCatalog(id);
    expect(useComboStore.getState().cards).toHaveLength(0);
  });
});

describe('ステップ管理', () => {
  it('ルート末尾にステップを追加する', async () => {
    addRouteAndSelect();
    const cardId = await addTestCard();
    const stepId = useComboStore.getState().addStepToEnd({
      type: 'action',
      actions: ['normalSummon'],
      cardId,
      relatedCards: [],
    });
    const route = getCurrentRoute();
    expect(route.steps).toHaveLength(1);
    expect(route.steps[0].id).toBe(stepId);
  });

  it('指定位置にステップを追加する', async () => {
    addRouteAndSelect();
    const cardId = await addTestCard();
    const stepId = useComboStore.getState().addStepAtPosition(
      { type: 'action', actions: ['draw'], cardId, relatedCards: [] },
      { x: 100, y: 200 },
    );
    const step = getCurrentRoute().steps[0];
    expect(step.id).toBe(stepId);
    expect(step.position).toEqual({ x: 100, y: 200 });
  });

  it('指定位置追加時は自動接続しない', async () => {
    addRouteAndSelect();
    const cardId = await addTestCard();
    useComboStore.getState().addStepAtPosition(
      { type: 'action', actions: ['normalSummon'], cardId, relatedCards: [] },
      { x: 0, y: 0 },
    );
    useComboStore.getState().addStepAtPosition(
      { type: 'action', actions: ['draw'], cardId, relatedCards: [] },
      { x: 100, y: 0 },
    );
    expect(getCurrentRoute().connections).toHaveLength(0);
  });

  it('ステップを追加すると既存の末端から接続される', async () => {
    addRouteAndSelect();
    const cardId = await addTestCard();
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
    const route = getCurrentRoute();
    expect(route.connections.some((c) => c.source === firstId && c.target === secondId)).toBe(true);
  });

  it('指定ステップの後にステップを追加する', async () => {
    addRouteAndSelect();
    const cardId = await addTestCard();
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
    const route = getCurrentRoute();
    expect(route.connections.some((c) => c.source === stepId1 && c.target === stepId2)).toBe(true);
  });

  it('分岐を追加する', async () => {
    addRouteAndSelect();
    const cardId = await addTestCard();
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
    const route = getCurrentRoute();
    expect(route.steps.some((s) => s.id === branchId)).toBe(true);
    expect(route.connections.some((c) => c.source === sourceId && c.target === branchId)).toBe(true);
  });

  it('接続線上にステップを挿入する', async () => {
    addRouteAndSelect();
    const cardId = await addTestCard();
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
    const connection = getCurrentRoute().connections[0];
    const insertedId = useComboStore.getState().insertStepOnConnection(connection.id, {
      type: 'action',
      actions: ['effect'],
      cardId,
      relatedCards: [],
    });
    const route = getCurrentRoute();
    expect(route.steps.some((s) => s.id === insertedId)).toBe(true);
  });

  it('ステップを更新する', async () => {
    addRouteAndSelect();
    const cardId = await addTestCard();
    const stepId = useComboStore.getState().addStepToEnd({
      type: 'action',
      actions: ['normalSummon'],
      cardId,
      relatedCards: [],
    });
    useComboStore.getState().updateStep(stepId, { actions: ['draw'] });
    const step = getCurrentRoute().steps[0];
    expect(step.actions).toEqual(['draw']);
  });

  it('空の説明もそのまま更新する', async () => {
    addRouteAndSelect();
    const cardId = await addTestCard();
    const stepId = useComboStore.getState().addStepToEnd({
      type: 'action',
      actions: ['normalSummon'],
      cardId,
      relatedCards: [],
      description: '説明',
    });
    useComboStore.getState().updateStep(stepId, { description: '' });
    const step = getCurrentRoute().steps[0];
    expect(step.description).toBe('');
  });

  it('ステップ位置を更新する', async () => {
    addRouteAndSelect();
    const cardId = await addTestCard();
    const stepId = useComboStore.getState().addStepToEnd({
      type: 'action',
      actions: ['normalSummon'],
      cardId,
      relatedCards: [],
    });
    useComboStore.getState().updateStepPosition(stepId, { x: 999, y: 888 });
    const step = getCurrentRoute().steps[0];
    expect(step.position).toEqual({ x: 999, y: 888 });
  });

  it('ステップを削除する', async () => {
    addRouteAndSelect();
    const cardId = await addTestCard();
    const stepId = useComboStore.getState().addStepToEnd({
      type: 'action',
      actions: ['normalSummon'],
      cardId,
      relatedCards: [],
    });
    useComboStore.getState().deleteStep(stepId);
    expect(getCurrentRoute().steps).toHaveLength(0);
  });
});

describe('接続線管理', () => {
  it('接続線を追加する', async () => {
    addRouteAndSelect();
    const currentDeck = useComboStore.getState().currentDeck;
    if (!currentDeck) throw new Error('currentDeck is null');
    const route = getCurrentRoute();
    useComboStore.setState({
      currentDeck: {
        ...currentDeck,
        routes: currentDeck.routes.map((r) =>
          r.id === route.id
            ? {
                ...r,
                steps: [
                  { id: 'step_1', type: 'action' as const, actions: ['normalSummon'], cardId: 'card_1', relatedCards: [], position: { x: 0, y: 0 } },
                  { id: 'step_2', type: 'action' as const, actions: ['draw'], cardId: 'card_1', relatedCards: [], position: { x: 100, y: 0 } },
                ],
              }
            : r,
        ),
      },
    });
    const connectionId = useComboStore.getState().addConnection({
      source: 'step_1',
      target: 'step_2',
    });
    expect(connectionId).not.toBe('');
    expect(getCurrentRoute().connections.some((c) => c.id === connectionId)).toBe(true);
  });

  it('接続線追加時にNodeの位置は変わらない', () => {
    addRouteAndSelect();
    const currentDeck = useComboStore.getState().currentDeck;
    if (!currentDeck) throw new Error('currentDeck is null');
    const route = getCurrentRoute();
    useComboStore.setState({
      currentDeck: {
        ...currentDeck,
        routes: currentDeck.routes.map((r) =>
          r.id === route.id
            ? {
                ...r,
                steps: [
                  { id: 'step_1', type: 'action' as const, actions: ['normalSummon'], cardId: 'card_1', relatedCards: [], position: { x: 10, y: 20 } },
                  { id: 'step_2', type: 'action' as const, actions: ['draw'], cardId: 'card_1', relatedCards: [], position: { x: 110, y: 120 } },
                ],
              }
            : r,
        ),
      },
    });
    useComboStore.getState().addConnection({ source: 'step_1', target: 'step_2' });
    const steps = getCurrentRoute().steps;
    expect(steps[0].position).toEqual({ x: 10, y: 20 });
    expect(steps[1].position).toEqual({ x: 110, y: 120 });
  });

  it('自己接続は追加しない', async () => {
    addRouteAndSelect();
    const cardId = await addTestCard();
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
    const currentDeck = useComboStore.getState().currentDeck;
    if (!currentDeck) throw new Error('currentDeck is null');
    const route = getCurrentRoute();
    useComboStore.setState({
      currentDeck: {
        ...currentDeck,
        routes: currentDeck.routes.map((r) =>
          r.id === route.id
            ? {
                ...r,
                steps: [
                  { id: 'step_1', type: 'action' as const, actions: ['normalSummon'], cardId: 'card_1', relatedCards: [], position: { x: 0, y: 0 } },
                  { id: 'step_2', type: 'action' as const, actions: ['draw'], cardId: 'card_1', relatedCards: [], position: { x: 100, y: 0 } },
                ],
              }
            : r,
        ),
      },
    });
    const firstId = useComboStore.getState().addConnection({ source: 'step_1', target: 'step_2' });
    expect(firstId).not.toBe('');
    const id = useComboStore.getState().addConnection({ source: 'step_1', target: 'step_2' });
    expect(id).toBe('');
  });

  it('接続線を削除する', async () => {
    addRouteAndSelect();
    const cardId = await addTestCard();
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
    const route = getCurrentRoute();
    expect(route.connections.some((c) => c.id === connectionId)).toBe(false);
  });
});

describe('ドキュメント入出力', () => {
  it('ドキュメントをエクスポートする', () => {
    addRouteAndSelect();
    const deck = useComboStore.getState().exportDocument();
    expect(deck?.routes).toHaveLength(2);
  });

  it('ドキュメントをインポートする', async () => {
    const deck = {
      deckId: 'deck_1',
      name: 'Imported',
      source: { type: 'neuron' as const, deckCode: '' },
      cards: [],
      routes: [
        {
          id: 'route_imported',
          name: 'Imported',
          description: '',
          startingCardIds: [] as string[],
          steps: [],
          connections: [],
          result: { cardIds: [] as string[], description: '' },
        },
      ],
      currentRouteId: 'route_imported',
    };
    await useComboStore.getState().importDocument(deck);
    expect(useComboStore.getState().currentDeck?.routes).toHaveLength(1);
    expect(useComboStore.getState().currentDeck?.currentRouteId).toBe('route_imported');
  });

  it('保存HTMLからインポートすると画像をIndexedDBに保存する', async () => {
    const imgFile = createJpegFile('get_image(0).action.ダウンロード');
    await useComboStore.getState().importNeuronHtml(
      {
        name: 'HTML Deck',
        main: [
          {
            id: 'neuron_1',
            name: 'Card A',
            quantity: 1,
            type: '効果モンスター',
            imageSrc: './test_files/get_image(0).action.ダウンロード',
          },
        ],
        ex: [],
        side: [],
      },
      [imgFile],
    );

    expect(useComboStore.getState().currentDeck?.name).toBe('HTML Deck');
    expect(useComboStore.getState().cards[0].type).toBe('効果モンスター');

    const saved = await getCard('neuron_1');
    expect(saved?.imageBlob).not.toBeNull();
  });

  it('clearAll でドキュメントと履歴がリセットされる', async () => {
    await useComboStore.getState().addCardToCatalog({ name: 'Card', type: '効果モンスター', imageUrl: '' });
    const routeId = useComboStore.getState().addRoute('Route');
    useComboStore.getState().selectRoute(routeId);
    useComboStore.getState().selectStep('nonexistent');
    useComboStore.getState().setNodeEditing(true);

    await useComboStore.getState().clearAll();

    const state = useComboStore.getState();
    expect(state.cards).toHaveLength(0);
    // クリア後も空のキャンバスを防ぐため初期ルートが1つ残る
    expect(state.currentDeck?.routes).toHaveLength(1);
    expect(state.currentDeck?.routes[0].name).toBe('新規デッキ');
    expect(state.currentDeck?.name).toBe('新規デッキ');
    expect(state.currentDeck?.currentRouteId).toBe(state.currentDeck?.routes[0].id);
    expect(state.selection).toBeNull();
    expect(state.past).toHaveLength(0);
    expect(state.future).toHaveLength(0);
    expect(state.isNodeEditing).toBe(false);
  });

  it('ファイル名のUnicode正規化が異なっても画像をマッチできる', async () => {
    const nfdName = 'get_image(0).action.ダウンロード'.normalize('NFD');
    const imgFile = createJpegFile(nfdName);

    await useComboStore.getState().importNeuronHtml(
      {
        name: 'HTML Deck',
        main: [
          {
            id: 'neuron_1',
            name: 'Card A',
            quantity: 1,
            type: '効果モンスター',
            imageSrc: './test_files/get_image(0).action.ダウンロード',
          },
        ],
        ex: [],
        side: [],
      },
      [imgFile],
    );

    const saved = await getCard('neuron_1');
    expect(saved?.imageBlob).not.toBeNull();
  });

  it('URLエンコード・クエリ文字列・拡張子違いでも画像をマッチできる', async () => {
    const imgFile = createJpegFile('get_image(0).action');

    await useComboStore.getState().importNeuronHtml(
      {
        name: 'HTML Deck',
        main: [
          {
            id: 'neuron_1',
            name: 'Card A',
            quantity: 1,
            type: '効果モンスター',
            imageSrc: './test_files/get_image%280%29.action.%E3%83%80%E3%82%A6%E3%83%B3%E3%83%AD%E3%83%BC%E3%83%89?foo=bar',
          },
        ],
        ex: [],
        side: [],
      },
      [imgFile],
    );

    const saved = await getCard('neuron_1');
    expect(saved?.imageBlob).not.toBeNull();
  });

  it('デッキ名を更新する', () => {
    useComboStore.getState().renameCurrentDeck('New');
    expect(useComboStore.getState().currentDeck?.name).toBe('New');
  });
});

describe('履歴', () => {
  it('Undo で直前の状態に戻る', () => {
    addRouteAndSelect();
    expect(useComboStore.getState().canUndo()).toBe(true);
    performUndo();
    expect(useComboStore.getState().currentDeck?.routes).toHaveLength(1);
    expect(useComboStore.getState().canRedo()).toBe(true);
  });

  it('Redo で元に戻す', () => {
    addRouteAndSelect();
    performUndo();
    performRedo();
    expect(useComboStore.getState().currentDeck?.routes).toHaveLength(2);
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
  it('findRouteByStepId でステップが属するルートを探す', async () => {
    addRouteAndSelect();
    const cardId = await addTestCard();
    const stepId = useComboStore.getState().addStepToEnd({
      type: 'action',
      actions: ['normalSummon'],
      cardId,
      relatedCards: [],
    });
    const route = findRouteByStepId(useComboStore.getState().currentDeck?.routes ?? [], stepId);
    expect(route).toBeDefined();
    expect(route?.steps.some((s) => s.id === stepId)).toBe(true);
  });

  it('findRouteByConnectionId で接続線が属するルートを探す', () => {
    addRouteAndSelect();
    const currentDeck = useComboStore.getState().currentDeck;
    if (!currentDeck) throw new Error('currentDeck is null');
    const route = getCurrentRoute();
    useComboStore.setState({
      currentDeck: {
        ...currentDeck,
        routes: currentDeck.routes.map((r) =>
          r.id === route.id
            ? {
                ...r,
                steps: [
                  { id: 'step_1', type: 'action' as const, actions: ['normalSummon'], cardId: 'card_1', relatedCards: [], position: { x: 0, y: 0 } },
                  { id: 'step_2', type: 'action' as const, actions: ['draw'], cardId: 'card_1', relatedCards: [], position: { x: 100, y: 0 } },
                ],
              }
            : r,
        ),
      },
    });
    const connectionId = useComboStore.getState().addConnection({
      source: 'step_1',
      target: 'step_2',
    });
    expect(connectionId).not.toBe('');
    const foundRoute = findRouteByConnectionId(useComboStore.getState().currentDeck?.routes ?? [], connectionId);
    expect(foundRoute).toBeDefined();
  });

  it('relayoutDeck で全ルートのレイアウトを再計算する', () => {
    const deck = {
      deckId: 'deck_1',
      name: 'Test',
      source: { type: 'neuron' as const, deckCode: '' },
      cards: [],
      routes: [
        {
          id: 'route_1',
          name: 'R1',
          description: '',
          startingCardIds: [] as string[],
          steps: [{ id: 'step_1', type: 'note' as const, description: 'メモ', position: { x: 0, y: 0 } }],
          connections: [],
          result: { cardIds: [] as string[], description: '' },
        },
      ],
      currentRouteId: 'route_1',
    };
    const relayouted = relayoutDeck(deck);
    expect(relayouted.routes[0].steps[0].position.x).not.toBe(0);
  });
});
