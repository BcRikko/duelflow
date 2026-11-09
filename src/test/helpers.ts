import { createDefaultNodeFormData } from '../features/editor/model/form';
import { skipHistory, useComboStore } from '../features/editor/store/comboStore';

function createEmptyDocument() {
  return {
    schemaVersion: 2,
    deck: {
      id: 'deck_1',
      name: 'Test Deck',
      source: { type: 'neuron' as const, deckCode: '' },
      cards: [],
    },
    cardCatalog: [],
    routes: [],
  };
}

export function resetStore() {
  skipHistory(() => {
    useComboStore.setState({
      document: createEmptyDocument(),
      currentRouteId: null,
      selection: null,
      selectedCardIdForAdd: null,
      addNodeForm: createDefaultNodeFormData(),
      past: [],
      future: [],
      isNodeEditing: false,
    });
  });
}
