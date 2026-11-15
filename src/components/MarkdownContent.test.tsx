import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MarkdownContent from './MarkdownContent';

describe('MarkdownContent', () => {
  it('Markdown をレンダリングする', () => {
    render(<MarkdownContent># DuelFlow</MarkdownContent>);
    expect(screen.getByRole('heading', { name: 'DuelFlow' })).not.toBeNull();
  });

  it('https の外部リンクは target="_blank" rel="noopener noreferrer" を付ける', () => {
    render(<MarkdownContent>[link](https://example.com)</MarkdownContent>);
    const link = screen.getByRole('link', { name: 'link' });
    expect(link.getAttribute('href')).toBe('https://example.com');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('javascript: スキームのリンクはリンクとしてレンダリングされない', () => {
    render(<MarkdownContent>[evil](javascript:alert(1))</MarkdownContent>);
    expect(screen.queryByRole('link', { name: 'evil' })).toBeNull();
    expect(screen.getByText('evil')).not.toBeNull();
  });
});
