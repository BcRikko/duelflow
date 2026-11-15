import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ReactFlowProvider } from '@xyflow/react';
import { useComboStore } from '../../store/comboStore';
import { resetStore } from '../../../../test/helpers';
import { ActionNode } from './ActionNode';
import type { ActionNodeData } from './types';

const baseData: ActionNodeData = {
  cardName: 'カードA',
  actions: ['normalSummon'],
  cardId: 'card_1',
  cardType: 'monster',
  description: '',
  relatedCards: [],
};

describe('ActionNode', () => {
  beforeEach(() => {
    resetStore();
  });

  it('表示モードでレンダリングされる', () => {
    render(
      <ReactFlowProvider>
        <ActionNode id="step_1" data={baseData} />
      </ReactFlowProvider>,
    );
    expect(screen.getByText('カードA')).not.toBeNull();
  });

  it('クリックで編集モードに切り替わる', () => {
    render(
      <ReactFlowProvider>
        <ActionNode id="step_1" data={baseData} />
      </ReactFlowProvider>,
    );
    fireEvent.click(screen.getByText('カードA'));
    expect((screen.getByLabelText('通常召喚') as HTMLInputElement).checked).toBe(true);
  });

  it('削除ボタンでステップを削除する', () => {
    const state = useComboStore.getState();
    const currentDeck = state.currentDeck;
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
              description: '',
              position: { x: 0, y: 0 },
            },
          ],
        },
      },
    });
    render(
      <ReactFlowProvider>
        <ActionNode id="step_1" data={baseData} />
      </ReactFlowProvider>,
    );
    fireEvent.click(screen.getByTitle('削除'));
    expect(useComboStore.getState().currentDeck?.route.steps).toHaveLength(0);
  });
});
