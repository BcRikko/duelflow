import { fireEvent, render, screen } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useComboStore } from '../../editor/store/comboStore';
import { NeuronImportDialog } from './NeuronImportDialog';

function createEmptyDoc() {
  return {
    schemaVersion: 1,
    deck: { id: 'deck_1', name: 'Test', source: { type: 'neuron' as const, deckCode: '' }, cards: [] },
    cardCatalog: [],
    routes: [],
  };
}

function renderDialog(onClose = vi.fn()) {
  return render(
    <ReactFlowProvider>
      <NeuronImportDialog onClose={onClose} />
    </ReactFlowProvider>,
  );
}

beforeEach(() => {
  useComboStore.setState({
    document: createEmptyDoc(),
    currentRouteId: null,
    selection: null,
    selectedCardIdForAdd: null,
    addNodeForm: { type: 'action', actions: [], cardId: '', relatedCards: [], description: '' },
    past: [],
    future: [],
    isNodeEditing: false,
  });
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

  it('有効な JSON をインポートすると onClose が呼ばれる', () => {
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

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(useComboStore.getState().document.cardCatalog).toHaveLength(1);
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
});
