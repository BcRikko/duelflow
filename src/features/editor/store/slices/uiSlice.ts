import type { StateCreator } from 'zustand';
import { loadUiState } from '../../../../shared/uiStorage';
import { createDefaultNodeFormData } from '../../model/form';
import type { ComboActions, ComboState, UIActions, UIState } from '../types';

export const createUISlice: StateCreator<ComboState & ComboActions, [], [], UIState & UIActions> = (
  set,
) => ({
  initialized: false,
  selection: null,
  selectedCardIdForAdd: null,
  addNodeForm: createDefaultNodeFormData(),
  isNodeEditing: false,

  setNodeEditing: (editing) => set({ isNodeEditing: editing }),

  selectStep: (id) =>
    set({ selection: id ? { type: 'step', id } : null, selectedCardIdForAdd: null }),
  selectConnection: (id) =>
    set({ selection: id ? { type: 'connection', id } : null, selectedCardIdForAdd: null }),
  clearSelection: () => set({ selection: null }),
  selectCardForAdd: (id) =>
    set((state) => ({
      selectedCardIdForAdd: id,
      selection: null,
      addNodeForm:
        id && state.addNodeForm.type === 'action'
          ? { ...state.addNodeForm, cardId: id }
          : state.addNodeForm,
    })),
  setAddNodeForm: (form) =>
    set((state) => ({
      addNodeForm: typeof form === 'function' ? form(state.addNodeForm) : form,
    })),
  resetAddNodeForm: () =>
    set((state) => ({
      addNodeForm: createDefaultNodeFormData(state.selectedCardIdForAdd),
    })),
});

export function loadStoredSelection() {
  return loadUiState().selection;
}
