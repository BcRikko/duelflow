import type { CardTypeCategory } from '../../../../shared/cardType';
import type { StepCard } from '../../../combo/model/types';

export type ActionNodeData = {
  cardName: string;
  imageUrl: string;
  actions: string[];
  cardId: string;
  cardType: CardTypeCategory;
  description?: string;
  relatedCards: StepCard[];
};

export type NoteNodeData = {
  description: string;
};
