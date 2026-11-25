import { beforeEach, describe, expect, it } from 'vitest';
import { clearUiState, loadUiState, saveUiState } from './uiStorage';

const UI_KEY = 'duelflow-ui-v0';

describe('uiStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('loadUiState', () => {
    it('localStorage が空の場合、デフォルト値を返す', () => {
      expect(loadUiState()).toEqual({ selectedDeckId: null, selection: null });
    });

    it('有効な state を読み込める', () => {
      localStorage.setItem(
        UI_KEY,
        JSON.stringify({ selectedDeckId: 'deck_1', selection: { type: 'step', id: 'step_1' } }),
      );
      expect(loadUiState()).toEqual({
        selectedDeckId: 'deck_1',
        selection: { type: 'step', id: 'step_1' },
      });
    });

    it('破損した JSON の場合、デフォルト値を返す', () => {
      localStorage.setItem(UI_KEY, '{ invalid json');
      expect(loadUiState()).toEqual({ selectedDeckId: null, selection: null });
    });

    it('selectedDeckId が文字列でない場合は null を返す', () => {
      localStorage.setItem(UI_KEY, JSON.stringify({ selectedDeckId: 123 }));
      expect(loadUiState().selectedDeckId).toBeNull();
    });

    it('selection の type が不正な場合は null を返す', () => {
      localStorage.setItem(
        UI_KEY,
        JSON.stringify({ selection: { type: 'invalid', id: 'step_1' } }),
      );
      expect(loadUiState().selection).toBeNull();
    });

    it('selection の id が文字列でない場合は null を返す', () => {
      localStorage.setItem(UI_KEY, JSON.stringify({ selection: { type: 'step', id: 1 } }));
      expect(loadUiState().selection).toBeNull();
    });

    it('有効な複数ステップ選択を読み込める', () => {
      localStorage.setItem(
        UI_KEY,
        JSON.stringify({
          selectedDeckId: 'deck_1',
          selection: { type: 'steps', ids: ['step_1', 'step_2'] },
        }),
      );
      expect(loadUiState()).toEqual({
        selectedDeckId: 'deck_1',
        selection: { type: 'steps', ids: ['step_1', 'step_2'] },
      });
    });

    it('selection の ids が不正な場合は null を返す', () => {
      localStorage.setItem(
        UI_KEY,
        JSON.stringify({ selection: { type: 'steps', ids: ['step_1', 2] } }),
      );
      expect(loadUiState().selection).toBeNull();
    });
  });

  describe('saveUiState', () => {
    it('state を localStorage に保存する', () => {
      saveUiState({ selectedDeckId: 'deck_1' });
      expect(loadUiState().selectedDeckId).toBe('deck_1');
    });

    it('既存の値とマージする', () => {
      saveUiState({ selectedDeckId: 'deck_1' });
      saveUiState({ selection: { type: 'connection', id: 'conn_1' } });
      expect(loadUiState()).toEqual({
        selectedDeckId: 'deck_1',
        selection: { type: 'connection', id: 'conn_1' },
      });
    });
  });

  describe('clearUiState', () => {
    it('localStorage から state を削除する', () => {
      saveUiState({ selectedDeckId: 'deck_1' });
      clearUiState();
      expect(localStorage.getItem(UI_KEY)).toBeNull();
      expect(loadUiState()).toEqual({ selectedDeckId: null, selection: null });
    });
  });
});
