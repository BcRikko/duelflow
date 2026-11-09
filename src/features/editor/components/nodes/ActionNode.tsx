import { memo, useCallback, useState } from 'react';
import { useComboStore } from '../../store/comboStore';
import { ActionNodeDisplay } from './ActionNodeDisplay';
import { ActionNodeEdit } from './ActionNodeEdit';
import type { ActionNodeData } from './types';

type Props = {
  id: string;
  data: ActionNodeData;
  selected?: boolean;
};

export const ActionNode = memo(function ActionNode({ id, data, selected }: Props) {
  const deleteStep = useComboStore((state) => state.deleteStep);
  const selectStep = useComboStore((state) => state.selectStep);
  const [isEditing, setIsEditing] = useState(false);

  const handleEnterEdit = useCallback(() => {
    selectStep(id);
    setIsEditing(true);
  }, [id, selectStep]);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      deleteStep(id);
    },
    [deleteStep, id],
  );

  const handleSaved = useCallback(() => {
    setIsEditing(false);
  }, []);

  if (isEditing) {
    return <ActionNodeEdit id={id} data={data} selected={selected} onSaved={handleSaved} />;
  }

  return (
    <ActionNodeDisplay
      data={data}
      selected={selected}
      onEdit={handleEnterEdit}
      onDelete={handleDelete}
    />
  );
});
