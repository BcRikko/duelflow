import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useComboStore } from '../features/editor/store/comboStore';
import { resetStore } from '../test/helpers';
import { ClearAllButton } from './ClearAllButton';

describe('ClearAllButton', () => {
  beforeEach(() => {
    resetStore();
  });

  it('ボタンが表示される', () => {
    render(<ClearAllButton />);
    expect(screen.getByRole('button', { name: 'すべてクリア' })).toBeTruthy();
  });

  it('確認後にすべてクリアされる', async () => {
    useComboStore.getState().addCardToCatalog({ name: 'Card', type: '効果モンスター', quantity: 1 });
    useComboStore.getState().addRoute('Route');
    expect(useComboStore.getState().document.cardCatalog).toHaveLength(1);
    expect(useComboStore.getState().document.routes).toHaveLength(1);

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<ClearAllButton />);
    fireEvent.click(screen.getByRole('button', { name: 'すべてクリア' }));

    await waitFor(() => {
      expect(useComboStore.getState().document.cardCatalog).toHaveLength(0);
      // クリア後も空のキャンバスを防ぐため初期ルートが1つ残る
      expect(useComboStore.getState().document.routes).toHaveLength(1);
      expect(useComboStore.getState().document.deck.name).toBe('新規デッキ');
      expect(useComboStore.getState().document.routes[0].name).toBe('新規デッキ');
      expect(useComboStore.getState().currentRouteId).not.toBeNull();
    });
  });

  it('キャンセルした場合はクリアされない', () => {
    useComboStore.getState().addCardToCatalog({ name: 'Card', type: '効果モンスター', quantity: 1 });
    expect(useComboStore.getState().document.cardCatalog).toHaveLength(1);

    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ClearAllButton />);
    fireEvent.click(screen.getByRole('button', { name: 'すべてクリア' }));

    expect(useComboStore.getState().document.cardCatalog).toHaveLength(1);
  });
});
