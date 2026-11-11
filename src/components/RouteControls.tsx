import { useCallback } from 'react';
import { useComboStore } from '../features/editor/store/comboStore';
import styles from './Header.module.css';

export function RouteControls() {
  const decks = useComboStore((state) => state.decks);
  const currentDeck = useComboStore((state) => state.currentDeck);
  const routes = currentDeck?.routes ?? [];
  const currentRouteId = currentDeck?.currentRouteId ?? null;
  const selectDeck = useComboStore((state) => state.selectDeck);
  const createDeck = useComboStore((state) => state.createDeck);
  const addRoute = useComboStore((state) => state.addRoute);
  const selectRoute = useComboStore((state) => state.selectRoute);
  const deleteRoute = useComboStore((state) => state.deleteRoute);

  const handleDelete = useCallback(() => {
    if (currentRouteId && confirm('現在のルートを削除しますか？')) {
      deleteRoute(currentRouteId);
    }
  }, [currentRouteId, deleteRoute]);

  const handleAddRoute = useCallback(() => {
    const defaultName = currentDeck?.name || '新規ルート';
    const name = window.prompt('ルート名を入力してください', defaultName);
    if (name == null) return;
    addRoute(name.trim() || defaultName);
  }, [addRoute, currentDeck?.name]);

  const handleCreateDeck = useCallback(() => {
    const name = window.prompt('デッキ名を入力してください', '新規デッキ');
    if (name == null) return;
    createDeck(name.trim() || '新規デッキ');
  }, [createDeck]);

  return (
    <div className={styles.group}>
      <select
        className={styles.routeSelect}
        value={currentDeck?.deckId ?? ''}
        onChange={(e) => selectDeck(e.target.value)}
      >
        {decks.map((deck) => (
          <option key={deck.deckId} value={deck.deckId}>
            {deck.name}
          </option>
        ))}
      </select>
      <button type="button" className={styles.button} onClick={handleCreateDeck}>
        + デッキ
      </button>
      <select
        className={styles.routeSelect}
        value={currentRouteId ?? ''}
        onChange={(e) => selectRoute(e.target.value)}
      >
        {routes.map((route) => (
          <option key={route.id} value={route.id}>
            {route.name}
          </option>
        ))}
      </select>
      <button type="button" className={styles.button} onClick={handleAddRoute}>
        + ルート追加
      </button>
      {routes.length > 1 ? (
        <button
          type="button"
          className={`${styles.button} ${styles.danger}`}
          onClick={handleDelete}
        >
          削除
        </button>
      ) : null}
    </div>
  );
}
