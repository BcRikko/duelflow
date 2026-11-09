import { describe, expect, it } from 'vitest';
import { generateBookmarkletCode, generateBookmarkletHref } from './bookmarklet';

describe('generateBookmarkletHref', () => {
  it('javascript: URL を生成する', () => {
    const href = generateBookmarkletHref();
    expect(href.startsWith('javascript:')).toBe(true);
  });

  it('スクリプト部分が encodeURIComponent されている', () => {
    const href = generateBookmarkletHref();
    const encoded = href.replace('javascript:', '');
    expect(() => decodeURIComponent(encoded)).not.toThrow();
  });

  it('固定のブックマークレット文字列を含む', () => {
    const href = generateBookmarkletHref();
    expect(href).toContain('DuelFlow');
  });
});

describe('generateBookmarkletCode', () => {
  it('javascript: URL として出力する', () => {
    const code = generateBookmarkletCode();
    expect(code.startsWith('javascript:')).toBe(true);
  });

  it('生のスクリプト文字列を含む', () => {
    const code = generateBookmarkletCode();
    expect(code).toContain('copyToClipboard');
  });
});
