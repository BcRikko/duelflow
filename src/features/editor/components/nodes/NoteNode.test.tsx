import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ReactFlowProvider } from '@xyflow/react';
import { useComboStore } from '../../store/comboStore';
import { resetStore } from '../../../../test/helpers';
import { NoteNode } from './NoteNode';
import type { NoteNodeData } from './types';

const baseData: NoteNodeData = { description: 'テストメモ' };

describe('NoteNode', () => {
  beforeEach(() => {
    resetStore();
  });

  it('表示モードでレンダリングされる', () => {
    render(
      <ReactFlowProvider>
        <NoteNode id="step_1" data={baseData} />
      </ReactFlowProvider>,
    );
    expect(screen.getByText('テストメモ')).not.toBeNull();
  });

  it('クリックで編集モードに切り替わる', () => {
    render(
      <ReactFlowProvider>
        <NoteNode id="step_1" data={baseData} />
      </ReactFlowProvider>,
    );
    fireEvent.click(screen.getByText('テストメモ'));
    expect(screen.getByDisplayValue('テストメモ')).not.toBeNull();
  });

  it('削除ボタンでステップを削除する', () => {
    useComboStore.getState().addRoute();
    useComboStore.getState().document.routes[0].steps.push({
      id: 'step_1',
      type: 'note',
      description: 'テストメモ',
      position: { x: 0, y: 0 },
    });
    render(
      <ReactFlowProvider>
        <NoteNode id="step_1" data={baseData} />
      </ReactFlowProvider>,
    );
    fireEvent.click(screen.getByTitle('削除'));
    expect(useComboStore.getState().document.routes[0].steps).toHaveLength(0);
  });
});
