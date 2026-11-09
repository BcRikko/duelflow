import { actionDefinitions } from '../../../shared/actionDefinitions';
import type { Step, StepCard } from '../../combo/model/types';

type DistributiveOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

export type StepWithoutIdPosition = DistributiveOmit<Step, 'id' | 'position'>;

export type NodeFormData =
  | {
      type: 'action';
      actions: string[];
      cardId: string;
      relatedCards: StepCard[];
      description: string;
    }
  | {
      type: 'note';
      description: string;
    };

export function createDefaultNodeFormData(
  defaultCardId?: string | null,
): NodeFormData {
  return {
    type: 'action',
    actions: actionDefinitions[0]?.id ? [actionDefinitions[0].id] : [],
    cardId: defaultCardId ?? '',
    relatedCards: [],
    description: '',
  };
}

export function buildStepFromForm(form: NodeFormData): StepWithoutIdPosition {
  if (form.type === 'action') {
    return {
      type: 'action',
      actions: form.actions,
      cardId: form.cardId,
      relatedCards: form.relatedCards,
      description: form.description || undefined,
    };
  }
  return {
    type: 'note',
    description: form.description,
  };
}
