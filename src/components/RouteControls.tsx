import { useCallback } from 'react';
import { useComboStore } from '../features/editor/store/comboStore';
import styles from './Header.module.css';

export function RouteControls() {
  const routes = useComboStore((state) => state.document.routes);
  const currentRouteId = useComboStore((state) => state.currentRouteId);
  const addRoute = useComboStore((state) => state.addRoute);
  const selectRoute = useComboStore((state) => state.selectRoute);
  const deleteRoute = useComboStore((state) => state.deleteRoute);

  const handleDelete = useCallback(() => {
    if (currentRouteId && confirm('現在のルートを削除しますか？')) {
      deleteRoute(currentRouteId);
    }
  }, [currentRouteId, deleteRoute]);

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
      <button type="button" className={styles.button} onClick={() => addRoute()}>
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
