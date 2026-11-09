import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useComboStore } from '../features/editor/store/comboStore';
import { resetStore } from '../test/helpers';
import { ImportExportControls } from './ImportExportControls';

function createValidDoc() {
  return {
    schemaVersion: 1,
    deck: {
      id: 'deck_1',
      name: 'Imported',
      source: { type: 'neuron' as const, deckCode: '' },
      cards: [],
    },
    cardCatalog: [],
    routes: [
      {
        id: 'route_1',
        name: 'Route',
        description: '',
        startingCardIds: [],
        steps: [],
        connections: [],
        result: { cardIds: [], description: '' },
      },
    ],
  };
}

function createReaderMock() {
  return {
    readAsText: vi.fn(),
    onload: null as ((e: { target: { result: string } }) => void) | null,
    result: '',
  };
}

describe('ImportExportControls', () => {
  beforeEach(() => {
    resetStore();
    vi.stubGlobal('alert', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('各ボタンを表示する', () => {
    render(<ImportExportControls />);
    expect(screen.getByText('ニューロン')).not.toBeNull();
    expect(screen.getByText('JSON読み込み')).not.toBeNull();
    expect(screen.getByText('JSON書き出し')).not.toBeNull();
  });

  it('JSON書き出しボタンでダウンロード用リンクを生成する', () => {
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    render(<ImportExportControls />);
    fireEvent.click(screen.getByText('JSON書き出し'));
    expect(createObjectURLSpy).toHaveBeenCalled();
    createObjectURLSpy.mockRestore();
  });

  it('有効な JSON ファイルを読み込む', () => {
    const doc = createValidDoc();
    const file = new File([JSON.stringify(doc)], 'test.json', { type: 'application/json' });

    let readerMock = createReaderMock();
    vi.stubGlobal(
      'FileReader',
      vi.fn(function () {
        readerMock = createReaderMock();
        return readerMock;
      }),
    );

    render(<ImportExportControls />);
    const input = screen.getByText('JSON読み込み').previousElementSibling as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    act(() => {
      readerMock.result = JSON.stringify(doc);
      readerMock.onload?.({ target: { result: JSON.stringify(doc) } });
    });

    expect(useComboStore.getState().document.deck.name).toBe('Imported');
    vi.unstubAllGlobals();
  });

  it('無効な JSON ファイルでアラートを表示する', () => {
    const file = new File(['not json'], 'test.json', { type: 'application/json' });

    let readerMock = createReaderMock();
    vi.stubGlobal(
      'FileReader',
      vi.fn(function () {
        readerMock = createReaderMock();
        return readerMock;
      }),
    );

    render(<ImportExportControls />);
    const input = screen.getByText('JSON読み込み').previousElementSibling as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    act(() => {
      readerMock.result = 'not json';
      readerMock.onload?.({ target: { result: 'not json' } });
    });

    expect(window.alert).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('ニューロンボタンでダイアログを開く', () => {
    render(<ImportExportControls />);
    fireEvent.click(screen.getByText('ニューロン'));
    expect(screen.getByText('ニューロンからインポート')).not.toBeNull();
  });
});
