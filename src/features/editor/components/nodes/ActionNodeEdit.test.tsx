import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReactFlowProvider } from '@xyflow/react';
import { useComboStore } from '../../store/comboStore';
import { resetStore } from '../../../../test/helpers';
import { ActionNodeEdit } from './ActionNodeEdit';
import type { ActionNodeData } from './types';

const baseData: ActionNodeData = {
  cardName: 'ブラック・マジシャン',
  imageUrl: '',
  actions: ['normalSummon'],
  cardId: 'card_1',
  cardType: 'monster',
  description: '説明',
  relatedCards: [],
};

function renderNode(data = baseData, onSaved = vi.fn()) {
  return render(
    <ReactFlowProvider>
      <ActionNodeEdit id="step_1" data={data} onSaved={onSaved} />
    </ReactFlowProvider>,
  );
}

function setupRouteWithStep() {
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
            relatedCards: [],
            description: '説明',
            position: { x: 0, y: 0 },
          },
        ],
      },
    },
  });
}

describe('ActionNodeEdit', () => {
  beforeEach(async () => {
    resetStore();
    await useComboStore.getState().addCardToCatalog({ name: 'カードA', imageUrl: '', type: 'モンスター' });
    await useComboStore.getState().addCardToCatalog({ name: 'カードB', imageUrl: '', type: '魔法' });
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
