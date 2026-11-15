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
  return useComboStore.getState().addCardToCatalog({ name, type: 'monster' });
}

function getCurrentRoute() {
  const { currentDeck } = useComboStore.getState();
  if (!currentDeck) throw new Error('currentDeck is null');
  return currentDeck.route;
}

describe('カードカタログ', () => {
  it('カードを追加する', async () => {
    const id = await addTestCard();
    expect(useComboStore.getState().cards).toHaveLength(1);
    expect(useComboStore.getState().cards[0].id).toBe(id);
    expect(useComboStore.getState().currentDeck?.cards).toHaveLength(1);
    expect(useComboStore.getState().currentDeck?.cards[0].cardId).toBe(id);
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

  it('カードを削除するとデッキおよびルート内の参照も削除される', async () => {
    const cardId = await addTestCard();
    const relatedCardId = await addTestCard('Related');

    const stepId = useComboStore.getState().addStepToEnd({
      type: 'action',
      actions: ['normalSummon'],
      cardId,
      relatedCards: [{ cardId: relatedCardId, role: 'cost' }],
    });

    await useComboStore.getState().removeCardFromCatalog(relatedCardId);

    const step = getCurrentRoute().steps.find((s) => s.id === stepId);
    expect(step?.type === 'action' ? step.relatedCards : []).toHaveLength(0);
    expect(useComboStore.getState().currentDeck?.cards.some((c) => c.cardId === relatedCardId)).toBe(false);
  });
});

describe('ルート管理', () => {
  it('ルート情報を更新する', () => {
    useComboStore.getState().updateRoute({ name: 'Updated' });
    expect(getCurrentRoute()?.name).toBe('Updated');
  });
});

describe('ステップ管理', () => {
  it('ルート末尾にステップを追加する', async () => {
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

  it('ステップ削除時に既存接続と重複する接続は作られない', async () => {
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
    const stepId3 = useComboStore.getState().addStepAfter(stepId1, {
      type: 'action',
      actions: ['effect'],
      cardId,
      relatedCards: [],
    });

    useComboStore.getState().deleteStep(stepId3);

    const route = getCurrentRoute();
    expect(route.connections.filter((c) => c.source === stepId1 && c.target === stepId2)).toHaveLength(1);
  });
});

describe('接続線管理', () => {
  it('接続線を追加する', async () => {
    const currentDeck = useComboStore.getState().currentDeck;
    if (!currentDeck) throw new Error('currentDeck is null');
    useComboStore.setState({
      currentDeck: {
        ...currentDeck,
        route: {
          ...currentDeck.route,
          steps: [
            { id: 'step_1', type: 'action' as const, actions: ['normalSummon'], cardId: 'card_1', relatedCards: [], position: { x: 0, y: 0 } },
            { id: 'step_2', type: 'action' as const, actions: ['draw'], cardId: 'card_1', relatedCards: [], position: { x: 100, y: 0 } },
          ],
        },
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
    const currentDeck = useComboStore.getState().currentDeck;
    if (!currentDeck) throw new Error('currentDeck is null');
    useComboStore.setState({
      currentDeck: {
        ...currentDeck,
        route: {
          ...currentDeck.route,
          steps: [
            { id: 'step_1', type: 'action' as const, actions: ['normalSummon'], cardId: 'card_1', relatedCards: [], position: { x: 10, y: 20 } },
            { id: 'step_2', type: 'action' as const, actions: ['draw'], cardId: 'card_1', relatedCards: [], position: { x: 110, y: 120 } },
          ],
        },
      },
    });
    useComboStore.getState().addConnection({ source: 'step_1', target: 'step_2' });
    const steps = getCurrentRoute().steps;
    expect(steps[0].position).toEqual({ x: 10, y: 20 });
    expect(steps[1].position).toEqual({ x: 110, y: 120 });
  });

  it('自己接続は追加しない', async () => {
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
    const currentDeck = useComboStore.getState().currentDeck;
    if (!currentDeck) throw new Error('currentDeck is null');
    useComboStore.setState({
      currentDeck: {
        ...currentDeck,
        route: {
          ...currentDeck.route,
          steps: [
            { id: 'step_1', type: 'action' as const, actions: ['normalSummon'], cardId: 'card_1', relatedCards: [], position: { x: 0, y: 0 } },
            { id: 'step_2', type: 'action' as const, actions: ['draw'], cardId: 'card_1', relatedCards: [], position: { x: 100, y: 0 } },
          ],
        },
      },
    });
    const firstId = useComboStore.getState().addConnection({ source: 'step_1', target: 'step_2' });
    expect(firstId).not.toBe('');
    const id = useComboStore.getState().addConnection({ source: 'step_1', target: 'step_2' });
    expect(id).toBe('');
  });

  it('接続線を削除する', async () => {
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
    const deck = useComboStore.getState().exportDocument();
    expect(deck?.route).toBeDefined();
  });

  it('ドキュメントをインポートする', async () => {
    const deck = {
      deckId: 'deck_1',
      name: 'Imported',
      source: { type: 'neuron' as const, deckCode: '' },
      cards: [],
      route: {
        id: 'route_imported',
        name: 'Imported',
        description: '',
        startingCardIds: [] as string[],
        steps: [],
        connections: [],
        result: { cardIds: [] as string[], description: '' },
      },
    };
    await useComboStore.getState().importDocument(deck);
    expect(useComboStore.getState().currentDeck?.route.id).toBe('route_imported');
  });

  it('同じdeckIdのドキュメントを再度インポートすると上書きされ、デッキ一覧が重複しない', async () => {
    const deck = {
      deckId: 'deck_1',
      name: 'Imported',
      source: { type: 'neuron' as const, deckCode: '' },
      cards: [],
      route: {
        id: 'route_imported',
        name: 'Imported',
        description: '',
        startingCardIds: [] as string[],
        steps: [],
        connections: [],
        result: { cardIds: [] as string[], description: '' },
      },
    };
    await useComboStore.getState().importDocument(deck);
    await useComboStore.getState().importDocument({ ...deck, name: 'Imported Again' });

    const state = useComboStore.getState();
    expect(state.decks).toHaveLength(1);
    expect(state.decks[0].name).toBe('Imported Again');
    expect(state.currentDeck?.name).toBe('Imported Again');
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

    const state = useComboStore.getState();
    expect(state.currentDeck?.name).toBe('HTML Deck');
    expect(state.currentDeck?.cards).toHaveLength(1);
    expect(state.cards[0].type).toBe('効果モンスター');

    const saved = await getCard('neuron_1');
    expect(saved?.imageBlob).not.toBeNull();
  });

  it('clearAll でドキュメントと履歴がリセットされ、デッキは空になる', async () => {
    await useComboStore.getState().addCardToCatalog({ name: 'Card', type: '効果モンスター' });
    useComboStore.getState().selectStep('nonexistent');
    useComboStore.getState().setNodeEditing(true);

    await useComboStore.getState().clearAll();

    const state = useComboStore.getState();
    expect(state.cards).toHaveLength(0);
    expect(state.decks).toHaveLength(0);
    expect(state.currentDeck).toBeNull();
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
  it('Undo で直前の状態に戻る', async () => {
    useComboStore.getState().updateRoute({ name: 'Changed' });
    expect(useComboStore.getState().canUndo()).toBe(true);
    performUndo();
    expect(useComboStore.getState().currentDeck?.route.name).toBe('Test Deck');
    expect(useComboStore.getState().canRedo()).toBe(true);
  });

  it('Redo で元に戻す', async () => {
    useComboStore.getState().updateRoute({ name: 'Changed' });
    performUndo();
    performRedo();
    expect(useComboStore.getState().currentDeck?.route.name).toBe('Changed');
  });

  it('新しい変更を加えると future がクリアされる', async () => {
    useComboStore.getState().updateRoute({ name: 'Changed' });
    performUndo();
    expect(useComboStore.getState().canRedo()).toBe(true);
    useComboStore.getState().updateRoute({ name: 'Changed2' });
    expect(useComboStore.getState().canRedo()).toBe(false);
  });
});

describe('ヘルパー関数', () => {
  it('findRouteByStepId でステップが属するルートを探す', async () => {
    const cardId = await addTestCard();
    const stepId = useComboStore.getState().addStepToEnd({
      type: 'action',
      actions: ['normalSummon'],
      cardId,
      relatedCards: [],
    });
    const route = findRouteByStepId(useComboStore.getState().currentDeck?.route, stepId);
    expect(route).toBeDefined();
    expect(route?.steps.some((s) => s.id === stepId)).toBe(true);
  });

  it('findRouteByConnectionId で接続線が属するルートを探す', () => {
    const currentDeck = useComboStore.getState().currentDeck;
    if (!currentDeck) throw new Error('currentDeck is null');
    useComboStore.setState({
      currentDeck: {
        ...currentDeck,
        route: {
          ...currentDeck.route,
          steps: [
            { id: 'step_1', type: 'action' as const, actions: ['normalSummon'], cardId: 'card_1', relatedCards: [], position: { x: 0, y: 0 } },
            { id: 'step_2', type: 'action' as const, actions: ['draw'], cardId: 'card_1', relatedCards: [], position: { x: 100, y: 0 } },
          ],
        },
      },
    });
    const connectionId = useComboStore.getState().addConnection({
      source: 'step_1',
      target: 'step_2',
    });
    expect(connectionId).not.toBe('');
    const foundRoute = findRouteByConnectionId(useComboStore.getState().currentDeck?.route, connectionId);
    expect(foundRoute).toBeDefined();
  });

  it('relayoutDeck でルートのレイアウトを再計算する', () => {
    const deck = {
      deckId: 'deck_1',
      name: 'Test',
      source: { type: 'neuron' as const, deckCode: '' },
      cards: [],
      route: {
        id: 'route_1',
        name: 'R1',
        description: '',
        startingCardIds: [] as string[],
        steps: [{ id: 'step_1', type: 'note' as const, description: 'メモ', position: { x: 0, y: 0 } }],
        connections: [],
        result: { cardIds: [] as string[], description: '' },
      },
    };
    const relayouted = relayoutDeck(deck);
    expect(relayouted.route.steps[0].position.x).not.toBe(0);
  });
});
