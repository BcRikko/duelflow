import { useState } from 'react';
import { Dialog } from '../../../components/Dialog';
import dialogStyles from '../../../components/Dialog.module.css';
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_FILE_SIZE_BYTES,
} from '../../../shared/constants';
import { useComboStore } from '../../editor/store/comboStore';
import styles from './CardForm.module.css';

type CardFormProps = {
  onClose: () => void;
};

export function CardForm({ onClose }: CardFormProps) {
  const addCardToCatalog = useComboStore((state) => state.addCardToCatalog);
  const selectCardForAdd = useComboStore((state) => state.selectCardForAdd);

  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
      // eslint-disable-next-line no-alert
      alert('画像ファイルは5MB以下にしてください');
      e.target.value = '';
      setImageFile(null);
      return;
    }
    setImageFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const id = await addCardToCatalog(
      {
        name: name.trim(),
        type: type.trim() || 'モンスター',
      },
      imageFile ?? undefined,
    );

    selectCardForAdd(id);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Dialog
      onClose={onClose}
      size="small"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className={`${dialogStyles.button} ${dialogStyles.buttonSecondary}`}
          >
            キャンセル
          </button>
          <button
            type="submit"
            form="card-form"
            className={`${dialogStyles.button} ${dialogStyles.buttonPrimary}`}
            disabled={isSubmitting}
          >
            追加
          </button>
        </>
      }
    >
      <h3>カードを追加</h3>
      <form id="card-form" onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          カード名
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="カード名"
            autoFocus
          />
        </label>
        <label className={styles.field}>
          種別
          <input
            type="text"
            value={type}
            onChange={(e) => setType(e.target.value)}
            placeholder="例：効果モンスター、魔法、罠"
          />
          <div className={styles.typePresets}>
            <button type="button" onClick={() => setType('効果モンスター')}>
              効果モンスター
            </button>
            <button type="button" onClick={() => setType('魔法')}>
              魔法
            </button>
            <button type="button" onClick={() => setType('罠')}>
              罠
            </button>
          </div>
        </label>
        <label className={styles.field}>
          画像ファイル（任意）
          <input
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            onChange={handleFileChange}
          />
          <span className={styles.fileHint}>
            JPEG / PNG / GIF / WebP / BMP（5MB以下）
          </span>
        </label>
      </form>
    </Dialog>
  );
}
