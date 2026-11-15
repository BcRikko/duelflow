import type { CardTypeCategory } from '../../../../shared/cardType';
import type { StepCard } from '../../../combo/model/types';

export type ActionNodeData = {
  cardName: string;
  actions: string[];
  cardId: string;
  cardType: CardTypeCategory;
  description?: string;
  cardDescription?: string;
  relatedCards: StepCard[];
};

export type NoteNodeData = {
  description: string;
};
