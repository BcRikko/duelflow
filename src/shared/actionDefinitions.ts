type ActionCategory =
  | 'summon'
  | 'effect'
  | 'spellTrap'
  | 'acquire'
  | 'move'
  | 'display'
  | 'material'
  | 'other';

type ActionDefinition = {
  id: string;
  label: string;
  category: ActionCategory;
};

export const actionDefinitions: ActionDefinition[] = [
  // 召喚
  { id: 'normalSummon', label: '通常召喚', category: 'summon' },
  { id: 'specialSummon', label: '特殊召喚', category: 'summon' },
  { id: 'flipSummon', label: '反転召喚', category: 'summon' },
  // 効果
  { id: 'activateEffect', label: '効果発動', category: 'effect' },
  { id: 'resolveEffect', label: '効果処理', category: 'effect' },
  // 魔法・罠
  { id: 'activateSpell', label: '魔法カード発動', category: 'spellTrap' },
  { id: 'activateTrap', label: '罠カード発動', category: 'spellTrap' },
  { id: 'setCard', label: 'セット', category: 'spellTrap' },
  // カード取得
  { id: 'search', label: 'サーチ', category: 'acquire' },
  { id: 'recruit', label: 'リクルート', category: 'acquire' },
  { id: 'draw', label: 'ドロー', category: 'acquire' },
  { id: 'addToHand', label: '手札に加える', category: 'acquire' },
  // カード移動
  { id: 'discard', label: '手札から捨てる', category: 'move' },
  { id: 'sendToGraveyard', label: '墓地へ送る', category: 'move' },
  { id: 'revive', label: '蘇生', category: 'move' },
  { id: 'banish', label: '除外', category: 'move' },
  // 表示形式
  { id: 'faceUp', label: '表側表示にする', category: 'display' },
  { id: 'faceDown', label: '裏側表示にする', category: 'display' },
  { id: 'changePosition', label: '表示形式変更', category: 'display' },
  // 素材
  { id: 'fusionMaterial', label: '融合素材', category: 'material' },
  { id: 'synchroMaterial', label: 'シンクロ素材', category: 'material' },
  { id: 'xyzMaterial', label: 'エクシーズ素材', category: 'material' },
  { id: 'linkMaterial', label: 'リンク素材', category: 'material' },
  // その他
  { id: 'tribute', label: 'リリース', category: 'other' },
  { id: 'destroy', label: '破壊', category: 'other' },
  { id: 'bounce', label: 'バウンス', category: 'other' },
  { id: 'negate', label: '無効化', category: 'other' },
  { id: 'other', label: 'その他', category: 'other' },
];

export const actionMap = new Map(actionDefinitions.map((a) => [a.id, a]));

export function getActionLabel(actionId: string): string {
  return actionMap.get(actionId)?.label ?? actionId;
}

export function getActionLabels(actionIds: string[] | undefined): string {
  if (!actionIds) return '';
  return actionIds.map((id) => getActionLabel(id)).join(' + ');
}
