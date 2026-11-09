import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { actionDefinitions } from '../../../shared/actionDefinitions';
import { useComboStore } from '../store/comboStore';
import { resetStore } from '../../../test/helpers';
import { DropActionToolbar } from './DropActionToolbar';

describe('DropActionToolbar', () => {
  beforeEach(() => {
    resetStore();
  });

  it('ドロップ時アクションの選択肢を表示する', () => {
    render(<DropActionToolbar />);
    const select = screen.getByLabelText('ドロップ時のアクション');
    expect(select).not.toBeNull();
    expect(select.querySelectorAll('option').length).toBe(actionDefinitions.length);
  });

  it('アクションを選択するとストアが更新される', () => {
    render(<DropActionToolbar />);
    const select = screen.getByLabelText('ドロップ時のアクション');
    fireEvent.change(select, { target: { value: 'specialSummon' } });
    const form = useComboStore.getState().addNodeForm;
    expect(form.type).toBe('action');
    expect(form.actions).toEqual(['specialSummon']);
  });
});
