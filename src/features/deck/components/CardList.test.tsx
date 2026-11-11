import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useComboStore } from '../../editor/store/comboStore';
import { resetStore } from '../../../test/helpers';
import { CardList } from './CardList';

async function addCard(name: string, type: string) {
  const id = await useComboStore.getState().addCardToCatalog({ name, type, imageUrl: '' });
  return id;
}

describe('CardList', () => {
  beforeEach(() => {
    resetStore();
    vi.stubGlobal('confirm', () => true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('登録済みカードを表示する', async () => {
    await addCard('カードA', 'モンスター');
    render(<CardList />);
    expect(screen.getByText('カードA')).not.toBeNull();
  });

  it('検索でカードを絞り込む', async () => {
    await addCard('カードA', 'モンスター');
    await addCard('魔法B', '魔法');
    render(<CardList />);

    fireEvent.change(screen.getByPlaceholderText('カード名で検索'), {
      target: { value: '魔法' },
    });

    expect(screen.queryByText('カードA')).toBeNull();
    expect(screen.getByText('魔法B')).not.toBeNull();
  });

  it('カードをクリックして選択状態にする', async () => {
    const id = await addCard('カードA', 'モンスター');
    render(<CardList />);
    fireEvent.click(screen.getByText('カードA'));
    expect(useComboStore.getState().selectedCardIdForAdd).toBe(id);
  });

  it('削除ボタンでカードを削除する', async () => {
    await addCard('カードA', 'モンスター');
    render(<CardList />);
    fireEvent.click(screen.getByText('×'));
    await waitFor(() => {
      expect(useComboStore.getState().cards).toHaveLength(0);
    });
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

  it('ドラッグ開始時にカードIDをデータ転送に設定する', async () => {
    await addCard('カードA', 'モンスター');
    render(<CardList />);
    const card = screen.getByText('カードA').closest('li');
    const dataTransfer = { setData: vi.fn(), effectAllowed: '' };
    fireEvent.dragStart(card!, { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith('application/duelflow-card', expect.any(String));
  });
});
