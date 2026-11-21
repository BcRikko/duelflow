import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactFlowProvider } from '@xyflow/react';
import { readFileSync } from 'fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useComboStore } from '../../editor/store/comboStore';
import { resetStore } from '../../../test/helpers';
import { NeuronImportDialog } from './NeuronImportDialog';

function renderDialog(onClose = vi.fn()) {
  return render(
    <ReactFlowProvider>
      <NeuronImportDialog onClose={onClose} />
    </ReactFlowProvider>,
  );
}

beforeEach(() => {
  resetStore();
  vi.clearAllMocks();
});

describe('NeuronImportDialog', () => {
  it('ダイアログが表示される', () => {
    renderDialog();
    expect(screen.getByText('デッキを追加')).not.toBeNull();
    expect(screen.getByText('遊戯王NEURON')).not.toBeNull();
  });

  it('キャンセルボタンで onClose が呼ばれる', () => {
    const onClose = vi.fn();
    renderDialog(onClose);
    fireEvent.click(screen.getByText('キャンセル'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('デッキレシピのフォルダー選択ボタンが表示される', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: 'デッキレシピのフォルダーを選択' })).not.toBeNull();
  });

  it('HTMLフォルダを選択するとインポート処理が呼ばれる', async () => {
    const onClose = vi.fn();
    const importSpy = vi.spyOn(useComboStore.getState(), 'importNeuronHtml').mockResolvedValue();

    renderDialog(onClose);

    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta property="title" content="Test Deck | 遊戯王 デッキレシピ 詳細"></head>
        <body>
          <table id="monster_list">
            <tr>
              <td class="c_img"><img src="./test_files/card_icon_effect.png"></td>
              <td class="card_name">
                <span>Test Monster</span>
                <input type="hidden" class="link_value" value="cid=12345">
              </td>
              <td class="num"><span>1</span></td>
            </tr>
          </table>
          <img class="card_image_monster_0_1" alt="Test Monster" src="./test_files/get_image(0).action.ダウンロード">
        </body>
      </html>
    `;

    const htmlFile = new File([html], 'deck.html', { type: 'text/html' });
    const imgFile = new File(['image'], 'get_image(0).action.ダウンロード', { type: 'image/jpeg' });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, [htmlFile, imgFile]);

    await waitFor(() => {
      expect(importSpy).toHaveBeenCalledTimes(1);
    });

    importSpy.mockRestore();
  });

  it('HTMLファイルを選択するとカード一覧が登録される', async () => {
    renderDialog();

    const html = `
      <!DOCTYPE html>
      <html>
        <head><meta property="title" content="Test Deck | 遊戯王 デッキレシピ 詳細"></head>
        <body>
          <table id="monster_list">
            <tr>
              <td class="c_img"><img src="./test_files/card_icon_effect.png"></td>
              <td class="card_name">
                <span>Test Monster</span>
                <input type="hidden" class="link_value" value="cid=12345">
              </td>
              <td class="num"><span>1</span></td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const htmlFile = new File([html], 'deck.html', { type: 'text/html' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, [htmlFile]);

    await waitFor(() => {
      const state = useComboStore.getState();
      expect(state.currentDeck?.name).toBe('Test Deck');
      expect(state.currentDeck?.cards).toHaveLength(1);
      expect(state.cards).toHaveLength(1);
      expect(state.cards[0].name).toBe('Test Monster');
    });
  });

  it.skip('実際のニューロンデッキHTMLを選択するとカード一覧が登録される', async () => {
    renderDialog();

    const html = readFileSync('/tmp/neuron_deck.html', 'utf8');
    const htmlFile = new File([html], 'deck.html', { type: 'text/html' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(input, [htmlFile]);

    await waitFor(() => {
      const state = useComboStore.getState();
      expect(state.currentDeck?.name).toBe('レッドデーモン拡張');
      expect(state.currentDeck?.cards.length).toBeGreaterThan(0);
      expect(state.cards.length).toBeGreaterThan(0);
    });
  });
});
