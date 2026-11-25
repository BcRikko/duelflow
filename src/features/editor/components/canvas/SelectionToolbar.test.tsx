import { describe, expect, it } from 'vitest';
import { ReactFlow } from '@xyflow/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SelectionToolbar } from './SelectionToolbar';
import { useComboStore } from '../../store/comboStore';
import { resetStore } from '../../../../test/helpers';

function createStep(id: string, x: number, y: number) {
  return {
    id,
    type: 'default' as const,
    position: { x, y },
    data: {},
    width: 240,
    height: 80,
  };
}

describe('SelectionToolbar', () => {
  it('上下中央揃えを実行する', async () => {
    const user = userEvent.setup();
    resetStore();

    useComboStore.setState((state) => {
      if (!state.currentDeck) return state;
      return {
        currentDeck: {
          ...state.currentDeck,
          route: {
            ...state.currentDeck.route,
            steps: [
              { id: 'a', type: 'note' as const, description: '', position: { x: 0, y: 0 } },
              { id: 'b', type: 'note' as const, description: '', position: { x: 100, y: 200 } },
            ],
          },
        },
      };
    });
    useComboStore.getState().selectSteps(['a', 'b']);

    render(
      <ReactFlow nodes={[createStep('a', 0, 0), createStep('b', 100, 200)]}>
        <SelectionToolbar />
      </ReactFlow>,
    );

    await user.click(screen.getByTitle('上下中央揃え'));

    const route = useComboStore.getState().currentDeck?.route;
    const a = route?.steps.find((s) => s.id === 'a');
    const b = route?.steps.find((s) => s.id === 'b');
    expect(a?.position.y).toBe(b?.position.y);
  });

  it('選択が1件のときはツールバーを表示しない', () => {
    resetStore();
    useComboStore.getState().selectStep('a');

    render(
      <ReactFlow nodes={[createStep('a', 0, 0)]}>
        <SelectionToolbar />
      </ReactFlow>,
    );

    expect(screen.queryByTitle('上下中央揃え')).toBeNull();
  });
});
