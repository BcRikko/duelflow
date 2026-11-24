import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReactFlowProvider } from '@xyflow/react';
import { useComboStore } from '../../store/comboStore';
import { resetStore } from '../../../../test/helpers';
import { ActionNodeEdit } from './ActionNodeEdit';
import type { ActionNodeData } from './types';

function createBaseData(cardId = 'card_1'): ActionNodeData {
  return {
    cardName: 'ブラック・マジシャン',
    actions: ['normalSummon'],
    cardId,
    cardType: 'monster',
    description: '説明',
    relatedCards: [],
  };
}

function renderNode(data = createBaseData(), onSaved = vi.fn()) {
  return render(
    <ReactFlowProvider>
      <ActionNodeEdit id="step_1" data={data} onSaved={onSaved} />
    </ReactFlowProvider>,
  );
}

function setupRouteWithStep(overrides: { relatedCards?: { cardId: string; role: 'cost' | 'target' | 'material' | 'specialSummon' }[] } = {}) {
  const currentDeck = useComboStore.getState().currentDeck;
  if (!currentDeck) throw new Error('currentDeck is null');
  useComboStore.setState({
    currentDeck: {
      ...currentDeck,
      route: {
        ...currentDeck.route,
        steps: [
          {
            id: 'step_1',
            type: 'action',
            actions: ['normalSummon'],
            cardId: 'card_1',
            relatedCards: overrides.relatedCards ?? [],
            description: '説明',
            position: { x: 0, y: 0 },
          },
        ],
      },
    },
  });
}

describe('ActionNodeEdit', () => {
  let cardAId = '';
  let cardBId = '';

  beforeEach(async () => {
    resetStore();
    cardAId = await useComboStore.getState().addCardToCatalog({ name: 'カードA', type: 'モンスター' });
    cardBId = await useComboStore.getState().addCardToCatalog({ name: 'カードB', type: '魔法' });
    setupRouteWithStep();
  });

  it('編集フォームが表示される', () => {
    renderNode();
    expect((screen.getByLabelText('通常召喚') as HTMLInputElement).checked).toBe(true);
    expect(screen.getByDisplayValue('説明')).not.toBeNull();
  });

  it('アクションを変更してNode外をクリックすると保存される', async () => {
    const user = userEvent.setup();
    renderNode();
    await user.click(screen.getByLabelText('通常召喚'));
    await user.click(screen.getByLabelText('特殊召喚'));
    await user.click(document.body);
    const step = useComboStore.getState().currentDeck?.route.steps[0];
    expect(step?.actions).toEqual(['specialSummon']);
  });

  it('関連カードを追加できる', () => {
    renderNode();
    fireEvent.click(screen.getByText('+ 関連カード'));
    expect(screen.getAllByText('コスト').length).toBeGreaterThan(0);
  });

  it('関連カードの role を変更できる', async () => {
    const user = userEvent.setup();
    setupRouteWithStep({ relatedCards: [{ cardId: cardAId, role: 'cost' }] });
    renderNode({ ...createBaseData(), relatedCards: [{ cardId: cardAId, role: 'cost' }] });
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], 'target');
    await user.click(document.body);
    const step = useComboStore.getState().currentDeck?.route.steps[0];
    expect(step?.type).toBe('action');
    expect(step?.relatedCards[0].role).toBe('target');
  });

  it('関連カードのカードを変更できる', async () => {
    const user = userEvent.setup();
    setupRouteWithStep({ relatedCards: [{ cardId: cardAId, role: 'cost' }] });
    renderNode({ ...createBaseData(), relatedCards: [{ cardId: cardAId, role: 'cost' }] });
    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[1], cardBId);
    await user.click(document.body);
    const step = useComboStore.getState().currentDeck?.route.steps[0];
    expect(step?.type).toBe('action');
    expect(step?.relatedCards[0].cardId).toBe(cardBId);
  });

  it('関連カードの選択肢はデッキに含まれるカードに限定される', () => {
    setupRouteWithStep({ relatedCards: [{ cardId: cardAId, role: 'cost' }] });
    useComboStore.setState((state) => {
      if (!state.currentDeck) return state;
      return {
        currentDeck: {
          ...state.currentDeck,
          cards: state.currentDeck.cards.filter((entry) => entry.cardId !== cardBId),
        },
      };
    });
    renderNode({ ...createBaseData(), relatedCards: [{ cardId: cardAId, role: 'cost' }] });
    const cardSelect = screen.getAllByRole('combobox')[1];
    const optionValues = Array.from(cardSelect.querySelectorAll('option')).map((option) => option.value);
    expect(optionValues).toContain(cardAId);
    expect(optionValues).not.toContain(cardBId);
  });

  it('説明を変更してNode外をクリックすると保存される', async () => {
    const user = userEvent.setup();
    renderNode();
    const textarea = screen.getByDisplayValue('説明');
    await user.click(textarea);
    await user.type(textarea, '追加');
    await user.click(document.body);

    const step = useComboStore.getState().currentDeck?.route.steps[0];
    expect(step?.description).toBe('説明追加');
  });
});
