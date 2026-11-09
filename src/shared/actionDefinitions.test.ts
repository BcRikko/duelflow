import { describe, expect, it } from 'vitest';
import { actionDefinitions, actionMap, getActionLabel, getActionLabels } from './actionDefinitions';

describe('actionDefinitions', () => {
  it('定義一覧が空でない', () => {
    expect(actionDefinitions.length).toBeGreaterThan(0);
  });

  it('すべての定義に id, label, category が存在する', () => {
    for (const action of actionDefinitions) {
      expect(action.id).toBeTruthy();
      expect(action.label).toBeTruthy();
      expect(action.category).toBeTruthy();
    }
  });

  it('id が重複していない', () => {
    const ids = new Set(actionDefinitions.map((a) => a.id));
    expect(ids.size).toBe(actionDefinitions.length);
  });
});

describe('actionMap', () => {
  it('すべての定義がマップに登録されている', () => {
    expect(actionMap.size).toBe(actionDefinitions.length);
  });
});

describe('getActionLabel', () => {
  it('登録済みの id に対してラベルを返す', () => {
    expect(getActionLabel('normalSummon')).toBe('通常召喚');
  });

  it('未登録の id に対して id 自体を返す', () => {
    expect(getActionLabel('unknownAction')).toBe('unknownAction');
  });
});

describe('getActionLabels', () => {
  it('複数のアクションラベルを + で結合して返す', () => {
    expect(getActionLabels(['normalSummon', 'activateEffect'])).toBe('通常召喚 + 効果発動');
  });

  it('空配列の場合は空文字を返す', () => {
    expect(getActionLabels([])).toBe('');
  });
});
