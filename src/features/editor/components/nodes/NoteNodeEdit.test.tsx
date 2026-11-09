import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReactFlowProvider } from '@xyflow/react';
import { useComboStore } from '../../store/comboStore';
import { resetStore } from '../../../../test/helpers';
import { NoteNodeEdit } from './NoteNodeEdit';
import type { NoteNodeData } from './types';

const baseData: NoteNodeData = { description: 'テストメモ' };

function renderNode(data = baseData, onSaved = vi.fn(), onDelete = vi.fn()) {
  return render(
    <ReactFlowProvider>
      <NoteNodeEdit id="step_1" data={data} onSaved={onSaved} onDelete={onDelete} />
    </ReactFlowProvider>,
  );
}

describe('NoteNodeEdit', () => {
  beforeEach(() => {
    resetStore();
    useComboStore.getState().addRoute();
    useComboStore.getState().document.routes[0].steps.push({
      id: 'step_1',
      type: 'note',
      description: 'テストメモ',
      position: { x: 0, y: 0 },
    });
  });

  it('テキストエリアにメモ内容を表示する', () => {
    renderNode();
    expect(screen.getByDisplayValue('テストメモ')).not.toBeNull();
  });

  it('内容を変更してNode外をクリックすると保存される', () => {
    renderNode();
    const textarea = screen.getByDisplayValue('テストメモ');
    fireEvent.change(textarea, { target: { value: '更新後メモ' } });
    fireEvent.mouseDown(document.body);
    const step = useComboStore.getState().document.routes[0].steps[0];
    expect(step.description).toBe('更新後メモ');
  });

  it('Node内をクリックしても保存されない', () => {
    renderNode();
    const textarea = screen.getByDisplayValue('テストメモ');
    fireEvent.change(textarea, { target: { value: '更新後メモ' } });
    fireEvent.mouseDown(textarea);
    const step = useComboStore.getState().document.routes[0].steps[0];
    expect(step.description).toBe('テストメモ');
  });

  it('削除ボタンで onDelete が呼ばれる', () => {
    const onDelete = vi.fn();
    renderNode(baseData, vi.fn(), onDelete);
    fireEvent.click(screen.getByTitle('削除'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
