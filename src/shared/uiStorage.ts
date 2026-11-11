import type { EditorSelection } from '../features/editor/store/comboStore';

const UI_KEY = 'duelflow-ui-v0';

export type UiState = {
  selectedDeckId: string | null;
  selection: EditorSelection | null;
};

const defaultUiState: UiState = {
  selectedDeckId: null,
  selection: null,
};

export function loadUiState(): UiState {
  try {
    const raw = localStorage.getItem(UI_KEY);
    if (!raw) return { ...defaultUiState };
    const parsed = JSON.parse(raw) as Partial<UiState>;
    return {
      selectedDeckId: parsed.selectedDeckId ?? null,
      selection: isValidSelection(parsed.selection) ? parsed.selection : null,
    };
  } catch {
    return { ...defaultUiState };
  }
}

export function saveUiState(state: Partial<UiState>): void {
  try {
    const current = loadUiState();
    const next = { ...current, ...state };
    localStorage.setItem(UI_KEY, JSON.stringify(next));
  } catch {
    // LocalStorage が使えない環境では無視
  }
}

export function clearUiState(): void {
  try {
    localStorage.removeItem(UI_KEY);
  } catch {
    // ignore
  }
}

function isValidSelection(value: unknown): value is EditorSelection {
  if (value === null) return true;
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as { type?: unknown; id?: unknown };
  return (
    (obj.type === 'step' || obj.type === 'connection') && typeof obj.id === 'string'
  );
}
