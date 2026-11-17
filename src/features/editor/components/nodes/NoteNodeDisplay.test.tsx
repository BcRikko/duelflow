import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReactFlowProvider } from '@xyflow/react';
import { NoteNodeDisplay } from './NoteNodeDisplay';
import type { NoteNodeData } from './types';

const baseData: NoteNodeData = { description: 'テストメモ' };

function renderNode(data = baseData, onEdit = vi.fn(), onDelete = vi.fn()) {
  return render(
    <ReactFlowProvider>
      <NoteNodeDisplay data={data} onEdit={onEdit} onDelete={onDelete} />
    </ReactFlowProvider>,
  );
}

describe('NoteNodeDisplay', () => {
  it('メモ内容を表示する', () => {
    renderNode();
    expect(screen.getByText('テストメモ')).not.toBeNull();
    expect(screen.queryByText('メモ')).toBeNull();
  });

  it('改行を維持して表示する', () => {
    renderNode({ description: '1行目\n2行目' });
    const element = screen.getByText(/1行目/);
    expect(element.textContent).toContain('\n');
    expect(element.className).toMatch(/noteText/);
  });

  it('メモ内容が空の場合は「メモ」ラベルを表示する', () => {
    renderNode({ description: '' });
    expect(screen.getByText('メモ')).not.toBeNull();
  });

  it('クリックで編集モードに入る', () => {
    const onEdit = vi.fn();
    const { container } = renderNode(baseData, onEdit);
    fireEvent.click(container.firstChild!);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('削除ボタンで onDelete が呼ばれる', () => {
    const onDelete = vi.fn();
    renderNode(baseData, vi.fn(), onDelete);
    fireEvent.click(screen.getByTitle('削除'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
