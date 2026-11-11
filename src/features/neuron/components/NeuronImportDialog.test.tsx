import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactFlowProvider } from '@xyflow/react';
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
    expect(screen.getByText('ニューロンからインポート')).not.toBeNull();
  });

  it('キャンセルボタンで onClose が呼ばれる', () => {
    const onClose = vi.fn();
    renderDialog(onClose);
    fireEvent.click(screen.getByText('キャンセル'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('有効な JSON をインポートすると onClose が呼ばれる', async () => {
    const onClose = vi.fn();
    renderDialog(onClose);

    const json = JSON.stringify({
      deck: {
        id: 'neuron_1',
        name: 'Test',
        main: [{ id: 'c1', name: 'CardA', quantity: 1, imageUrl: '' }],
        ex: [],
        side: [],
      },
    });

    fireEvent.change(screen.getByPlaceholderText('ここにJSONを貼り付け'), {
      target: { value: json },
    });
    fireEvent.click(screen.getByText('インポート'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(useComboStore.getState().cards).toHaveLength(1);
    });
  });

  it('無効な JSON でアラートが表示される', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderDialog();

    fireEvent.change(screen.getByPlaceholderText('ここにJSONを貼り付け'), {
      target: { value: 'not json' },
    });
    fireEvent.click(screen.getByText('インポート'));

    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('JSON が空の場合インポートボタンが無効', () => {
    renderDialog();
    const button = screen.getByText('インポート');
    expect(button.disabled).toBe(true);
  });

  it('「保存HTML」タブを切り替えるとフォルダ選択入力が表示される', () => {
    renderDialog();
    fireEvent.click(screen.getByText('保存HTML'));
    expect(screen.getByText(/保存したフォルダを選択/)).not.toBeNull();
  });

  it('HTMLフォルダを選択するとインポート処理が呼ばれる', async () => {
    const onClose = vi.fn();
    const importSpy = vi.spyOn(useComboStore.getState(), 'importNeuronHtml').mockResolvedValue();

    renderDialog(onClose);
    fireEvent.click(screen.getByText('保存HTML'));

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
});
