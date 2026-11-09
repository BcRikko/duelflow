import { describe, expect, it } from 'vitest';
import { generateId } from './id';

describe('generateId', () => {
  it('指定したプレフィックスで始まるIDを生成する', () => {
    const id = generateId('test_');
    expect(id.startsWith('test_')).toBe(true);
  });

  it('呼び出しごとに異なるIDを生成する', () => {
    const id1 = generateId('test_');
    const id2 = generateId('test_');
    expect(id1).not.toBe(id2);
  });

  it('プレフィックスが空でもIDを生成する', () => {
    const id = generateId('');
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});
