import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetStore } from '../test/helpers';
import { Header } from './Header';

describe('Header', () => {
  beforeEach(() => {
    resetStore();
  });

  it('ヘッダーがレンダリングされる', () => {
    render(<Header />);
    expect(screen.getByPlaceholderText('デッキ名')).not.toBeNull();
    expect(screen.getByText('↩ 元に戻す')).not.toBeNull();
    expect(screen.getByText('+ ルート追加')).not.toBeNull();
    expect(screen.getByText('JSON書き出し')).not.toBeNull();
  });
});
