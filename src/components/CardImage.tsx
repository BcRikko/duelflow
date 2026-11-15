import { useCardImageUrl } from '../shared/useCardImageUrl';

type CardImageProps = {
  cardId: string;
  cardName: string;
  className?: string;
  placeholderClassName?: string;
};

export function CardImage({ cardId, cardName, className, placeholderClassName }: CardImageProps) {
  const localImageUrl = useCardImageUrl(cardId, cardName);

  if (localImageUrl) {
    return <img src={localImageUrl} alt={cardName} className={className} />;
  }

  return <div className={placeholderClassName}>{cardName.charAt(0)}</div>;
}
