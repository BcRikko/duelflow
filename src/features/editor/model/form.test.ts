import { describe, expect, it } from 'vitest';
import { buildStepFromForm, createDefaultNodeFormData } from './form';

describe('createDefaultNodeFormData', () => {
  it('アクションノードのデフォルト値を返す', () => {
    const form = createDefaultNodeFormData();
    expect(form.type).toBe('action');
    expect(form.actions).toEqual(['normalSummon']);
    expect(form.cardId).toBe('');
    expect(form.relatedCards).toEqual([]);
  });

  it('デフォルトカードIDを反映する', () => {
    const form = createDefaultNodeFormData('card_1');
    expect(form.cardId).toBe('card_1');
  });

  it('null の場合は空文字を反映する', () => {
    const form = createDefaultNodeFormData(null);
    expect(form.cardId).toBe('');
  });
});

describe('buildStepFromForm', () => {
  it('アクションフォームからステップを構築する', () => {
    const form = {
      type: 'action' as const,
      actions: ['normalSummon'],
      cardId: 'card_1',
      relatedCards: [{ cardId: 'card_2', role: 'material' as const }],
      description: '説明',
    };
    const step = buildStepFromForm(form);
    expect(step.type).toBe('action');
    expect(step.actions).toEqual(['normalSummon']);
    expect(step.cardId).toBe('card_1');
    expect(step.relatedCards).toHaveLength(1);
    expect(step.description).toBe('説明');
  });

  it('空の説明は undefined になる', () => {
    const form = {
      type: 'action' as const,
      actions: ['normalSummon'],
      cardId: 'card_1',
      relatedCards: [],
      description: '',
    };
    const step = buildStepFromForm(form);
    expect(step.description).toBeUndefined();
  });

  it('メモフォームからメモステップを構築する', () => {
    const form = {
      type: 'note' as const,
      description: 'メモ内容',
    };
    const step = buildStepFromForm(form);
    expect(step.type).toBe('note');
    expect(step.description).toBe('メモ内容');
  });
});
