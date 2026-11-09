import { memo, useCallback, useState } from 'react';
import { useComboStore } from '../../store/comboStore';
import { NoteNodeDisplay } from './NoteNodeDisplay';
import { NoteNodeEdit } from './NoteNodeEdit';
import type { NoteNodeData } from './types';

type Props = {
  id: string;
  data: NoteNodeData;
  selected?: boolean;
};

export const NoteNode = memo(function NoteNode({ id, data, selected }: Props) {
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
    return (
      <NoteNodeEdit
        id={id}
        data={data}
        selected={selected}
        onSaved={handleSaved}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <NoteNodeDisplay
      data={data}
      selected={selected}
      onEdit={handleEnterEdit}
      onDelete={handleDelete}
    />
  );
});
