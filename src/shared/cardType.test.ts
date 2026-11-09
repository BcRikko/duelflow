import { describe, expect, it } from 'vitest';
import { detectCardTypeCategory, getCardTypeLabel } from './cardType';

describe('detectCardTypeCategory', () => {
  it('モンスター関連の文字列を判定する', () => {
    expect(detectCardTypeCategory('効果モンスター')).toBe('monster');
    expect(detectCardTypeCategory('怪獣')).toBe('monster');
    expect(detectCardTypeCategory('MONSTER')).toBe('unknown');
  });

  it('魔法関連の文字列を判定する', () => {
    expect(detectCardTypeCategory('通常魔法')).toBe('spell');
    expect(detectCardTypeCategory('Spell Card')).toBe('spell');
    expect(detectCardTypeCategory('スペル')).toBe('spell');
  });

  it('罠関連の文字列を判定する', () => {
    expect(detectCardTypeCategory('通常罠')).toBe('trap');
    expect(detectCardTypeCategory('Trap Card')).toBe('trap');
    expect(detectCardTypeCategory('トラップ')).toBe('trap');
  });

  it('該当しない文字列は unknown を返す', () => {
    expect(detectCardTypeCategory('')).toBe('unknown');
    expect(detectCardTypeCategory('フィールド')).toBe('unknown');
  });

  it('前後の空白を無視する', () => {
    expect(detectCardTypeCategory('  通常魔法  ')).toBe('spell');
    expect(detectCardTypeCategory('モンスター ')).toBe('monster');
  });
});

describe('getCardTypeLabel', () => {
  it('カテゴリごとに日本語ラベルを返す', () => {
    expect(getCardTypeLabel('monster')).toBe('モンスター');
    expect(getCardTypeLabel('spell')).toBe('魔法');
    expect(getCardTypeLabel('trap')).toBe('罠');
    expect(getCardTypeLabel('unknown')).toBe('その他');
  });
});
