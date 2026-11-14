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
    expect(screen.getByText('DuelFlow')).not.toBeNull();
    expect(screen.getByText('Test Deck')).not.toBeNull();
    expect(screen.getByTitle('元に戻す (Ctrl+Z / Cmd+Z)')).not.toBeNull();
    expect(screen.getByTitle('ルートをクリア')).not.toBeNull();
    expect(screen.getByTitle('展開ファイルの読み込み')).not.toBeNull();
    expect(screen.getByTitle('展開ファイルの保存')).not.toBeNull();
    expect(screen.getByTitle('使い方 (Shift + ?)')).not.toBeNull();
  });
});
