import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useComboStore } from '../../editor/store/comboStore';
import { resetStore } from '../../../test/helpers';
import { CardForm } from './CardForm';

describe('CardForm', () => {
  beforeEach(() => {
    resetStore();
  });

  it('フォームが表示される', () => {
    render(<CardForm onClose={vi.fn()} />);
    expect(screen.getByText('カードを追加')).not.toBeNull();
  });

  it('カード名を入力して追加するとストアに登録される', () => {
    render(<CardForm onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('カード名'), {
      target: { value: 'ブラック・マジシャン' },
    });
    fireEvent.click(screen.getByText('追加'));
    expect(useComboStore.getState().document.cardCatalog).toHaveLength(1);
    expect(useComboStore.getState().document.cardCatalog[0].name).toBe('ブラック・マジシャン');
  });

  it('種別プリセットボタンで種別を設定できる', () => {
    render(<CardForm onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('魔法'));
    fireEvent.change(screen.getByPlaceholderText('カード名'), {
      target: { value: 'カード' },
    });
    fireEvent.click(screen.getByText('追加'));
    expect(useComboStore.getState().document.cardCatalog[0].type).toBe('魔法');
  });

  it('キャンセルボタンで onClose が呼ばれる', () => {
    const onClose = vi.fn();
    render(<CardForm onClose={onClose} />);
    fireEvent.click(screen.getByText('キャンセル'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('カード名が空の場合は追加できない', () => {
    const onClose = vi.fn();
    render(<CardForm onClose={onClose} />);
    fireEvent.click(screen.getByText('追加'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
