import { useCallback } from 'react';
import { useComboStore } from '../features/editor/store/comboStore';
import styles from './Header.module.css';

export function RouteControls() {
  const routes = useComboStore((state) => state.document.routes);
  const deckName = useComboStore((state) => state.document.deck.name);
  const currentRouteId = useComboStore((state) => state.currentRouteId);
  const addRoute = useComboStore((state) => state.addRoute);
  const selectRoute = useComboStore((state) => state.selectRoute);
  const deleteRoute = useComboStore((state) => state.deleteRoute);

  const handleDelete = useCallback(() => {
    if (currentRouteId && confirm('現在のルートを削除しますか？')) {
      deleteRoute(currentRouteId);
    }
  }, [currentRouteId, deleteRoute]);

  const handleAddRoute = useCallback(() => {
    const defaultName = deckName || '新規ルート';
    const name = window.prompt('ルート名を入力してください', defaultName);
    if (name == null) return;
    addRoute(name.trim() || defaultName);
  }, [addRoute, deckName]);

  return (
    <div className={styles.group}>
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
