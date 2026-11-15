import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useComboStore } from '../features/editor/store/comboStore';
import { MAX_IMPORT_FILE_SIZE_BYTES } from '../shared/constants';
import { resetStore } from '../test/helpers';
import { ImportExportControls } from './ImportExportControls';

function createValidDeck() {
  return {
    schemaVersion: 0,
    deckId: 'deck_1',
    name: 'Imported',
    source: { type: 'neuron' as const, deckCode: '' },
    cards: [],
    route: {
      id: 'route_1',
      name: 'Route',
      description: '',
      startingCardIds: [] as string[],
      steps: [],
      connections: [],
      result: { cardIds: [] as string[], description: '' },
    },
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
    expect(screen.getByTitle('展開ファイルの読み込み')).not.toBeNull();
    expect(screen.getByTitle('展開ファイルの保存')).not.toBeNull();
  });

  it('展開ファイルの保存ボタンでダウンロード用リンクを生成する', () => {
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    render(<ImportExportControls />);
    fireEvent.click(screen.getByTitle('展開ファイルの保存'));
    expect(createObjectURLSpy).toHaveBeenCalled();
    createObjectURLSpy.mockRestore();
  });

  it('有効な JSON ファイルを読み込む', async () => {
    const deck = createValidDeck();
    const file = new File([JSON.stringify(deck)], 'test.json', { type: 'application/json' });

    let readerMock = createReaderMock();
    vi.stubGlobal(
      'FileReader',
      vi.fn(function () {
        readerMock = createReaderMock();
        return readerMock;
      }),
    );

    render(<ImportExportControls />);
    const input = screen.getByTitle('展開ファイルの読み込み').previousElementSibling as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    act(() => {
      readerMock.result = JSON.stringify(deck);
      readerMock.onload?.({ target: { result: JSON.stringify(deck) } });
    });

    await waitFor(() => {
      expect(useComboStore.getState().currentDeck?.name).toBe('Imported');
    });
    vi.unstubAllGlobals();
  });

  it('大きすぎるファイルは読み込まずアラートを表示する', () => {
    const fileReaderSpy = vi.fn();
    vi.stubGlobal('FileReader', fileReaderSpy);

    const bigFile = new File(['x'.repeat(MAX_IMPORT_FILE_SIZE_BYTES + 1)], 'big.json', {
      type: 'application/json',
    });

    render(<ImportExportControls />);
    const input = screen.getByTitle('展開ファイルの読み込み').previousElementSibling as HTMLInputElement;
    fireEvent.change(input, { target: { files: [bigFile] } });

    expect(fileReaderSpy).not.toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('ファイルサイズ'));
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
    const input = screen.getByTitle('展開ファイルの読み込み').previousElementSibling as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    act(() => {
      readerMock.result = 'not json';
      readerMock.onload?.({ target: { result: 'not json' } });
    });

    expect(window.alert).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
