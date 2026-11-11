import { createDefaultNodeFormData } from '../features/editor/model/form';
import { skipHistory, useComboStore } from '../features/editor/store/comboStore';
import type { DeckRecord } from '../shared/cardDatabase';

function createInitialRoute(name = '新規ルート') {
  return {
    id: 'route_1',
    name,
    description: '',
    startingCardIds: [] as string[],
    steps: [],
    connections: [],
    result: {
      cardIds: [] as string[],
      description: '',
    },
  };
}

function createEmptyDeck(): DeckRecord {
  const route = createInitialRoute('Test Deck');
  return {
    deckId: 'deck_1',
    name: 'Test Deck',
    source: { type: 'neuron', deckCode: '' },
    cards: [],
    routes: [route],
    currentRouteId: route.id,
  };
}

export function resetStore() {
  skipHistory(() => {
    useComboStore.setState({
      initialized: true,
      cards: [],
      decks: [{ deckId: 'deck_1', name: 'Test Deck' }],
      currentDeck: createEmptyDeck(),
      selection: null,
      selectedCardIdForAdd: null,
      addNodeForm: createDefaultNodeFormData(),
      past: [],
      future: [],
      isNodeEditing: false,
    });
  });
}
