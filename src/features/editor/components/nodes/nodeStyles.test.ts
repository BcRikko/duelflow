import { describe, expect, it } from 'vitest';
import { getTypeClass } from './nodeStyles';

describe('getTypeClass', () => {
  it('モンスターに対応するクラスを返す', () => {
    expect(getTypeClass('monster')).toBeDefined();
  });

  it('魔法に対応するクラスを返す', () => {
    expect(getTypeClass('spell')).toBeDefined();
  });

  it('罠に対応するクラスを返す', () => {
    expect(getTypeClass('trap')).toBeDefined();
  });

  it('未知の種別は unknown クラスを返す', () => {
    expect(getTypeClass('unknown')).toBeDefined();
    expect(getTypeClass('')).toBeDefined();
  });
});
