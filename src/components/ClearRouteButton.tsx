import { IconButton } from './IconButton';
import { TrashIcon } from './icons';
import { useComboStore } from '../features/editor/store/comboStore';

export function ClearRouteButton() {
  const clearRoute = useComboStore((state) => state.clearRoute);

  const handleClick = () => {
    if (!window.confirm('表示中のルートをクリアしますか？')) return;
    clearRoute();
  };

  return (
    <IconButton
      icon={<TrashIcon />}
      label="ルートをクリア"
      title="ルートをクリア"
      onClick={handleClick}
      variant="danger"
    />
  );
}
