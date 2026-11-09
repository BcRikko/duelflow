import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useComboStore } from '../../editor/store/comboStore';
import { resetStore } from '../../../test/helpers';
import { CardList } from './CardList';

describe('CardList', () => {
  beforeEach(() => {
    resetStore();
    vi.stubGlobal('confirm', () => true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('登録済みカードを表示する', () => {
    useComboStore.getState().addCardToCatalog({ name: 'カードA', type: 'モンスター', imageUrl: '' });
    render(<CardList />);
    expect(screen.getByText('カードA')).not.toBeNull();
  });

  it('検索でカードを絞り込む', () => {
    useComboStore.getState().addCardToCatalog({ name: 'カードA', type: 'モンスター', imageUrl: '' });
    useComboStore.getState().addCardToCatalog({ name: '魔法B', type: '魔法', imageUrl: '' });
    render(<CardList />);

    fireEvent.change(screen.getByPlaceholderText('カード名で検索'), {
      target: { value: '魔法' },
    });

    expect(screen.queryByText('カードA')).toBeNull();
    expect(screen.getByText('魔法B')).not.toBeNull();
  });

  it('カードをクリックして選択状態にする', () => {
    const id = useComboStore.getState().addCardToCatalog({
      name: 'カードA',
      type: 'モンスター',
      imageUrl: '',
    });
    render(<CardList />);
    fireEvent.click(screen.getByText('カードA'));
    expect(useComboStore.getState().selectedCardIdForAdd).toBe(id);
  });

  it('削除ボタンでカードを削除する', () => {
    useComboStore.getState().addCardToCatalog({ name: 'カードA', type: 'モンスター', imageUrl: '' });
    render(<CardList />);
    fireEvent.click(screen.getByText('×'));
    expect(useComboStore.getState().document.cardCatalog).toHaveLength(0);
  });

  it('カードがない場合は空のメッセージを表示する', () => {
    render(<CardList />);
    expect(screen.getByText('カードが登録されていません')).not.toBeNull();
  });

  it('追加ボタンでカードフォームを開く', () => {
    render(<CardList />);
    fireEvent.click(screen.getByText('+ 追加'));
    expect(screen.getByText('カードを追加')).not.toBeNull();
  });

  it('ドラッグ開始時にカードIDをデータ転送に設定する', () => {
    useComboStore.getState().addCardToCatalog({ name: 'カードA', type: 'モンスター', imageUrl: '' });
    render(<CardList />);
    const card = screen.getByText('カードA').closest('li');
    const dataTransfer = { setData: vi.fn(), effectAllowed: '' };
    fireEvent.dragStart(card!, { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith('application/duelflow-card', expect.any(String));
  });
});
