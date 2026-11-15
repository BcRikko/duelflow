import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ReactFlowProvider } from '@xyflow/react';
import { ActionNodeDisplay } from './ActionNodeDisplay';
import type { ActionNodeData } from './types';

vi.mock('../../../../components/CardImage', () => ({
  CardImage: ({ placeholderClassName, cardName }: { placeholderClassName?: string; cardName: string }) => (
    <div className={placeholderClassName}>{cardName.charAt(0)}</div>
  ),
}));

const baseData: ActionNodeData = {
  cardName: 'ブラック・マジシャン',
  actions: ['normalSummon'],
  cardId: 'card_1',
  cardType: 'monster',
  description: '説明文',
  relatedCards: [],
};

function renderNode(data = baseData, onEdit = vi.fn(), onDelete = vi.fn()) {
  return render(
    <ReactFlowProvider>
      <ActionNodeDisplay data={data} onEdit={onEdit} onDelete={onDelete} />
    </ReactFlowProvider>,
  );
}

describe('ActionNodeDisplay', () => {
  it('カード名とアクションを表示する', () => {
    renderNode();
    expect(screen.getByText('ブラック・マジシャン')).not.toBeNull();
    expect(screen.getByText('通常召喚')).not.toBeNull();
  });

  it('画像がない場合はプレースホルダーを表示する', () => {
    renderNode();
    expect(screen.getByText('ブ')).not.toBeNull();
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

  it('関連カードを表示する', () => {
    renderNode({
      ...baseData,
      relatedCards: [{ cardId: 'card_2', role: 'material' }],
    });
    expect(screen.getByText('素材')).not.toBeNull();
  });
});
