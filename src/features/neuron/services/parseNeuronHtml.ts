import { generateId } from '../../../shared/id';
import type { ComboDocument, DeckEntry } from '../../combo/model/types';

export type ParsedNeuronCard = {
  id: string;
  name: string;
  quantity: number;
  type: string;
  imageSrc: string | null;
};

export type ParsedNeuronDeck = {
  name: string;
  main: ParsedNeuronCard[];
  ex: ParsedNeuronCard[];
  side: ParsedNeuronCard[];
};

type SectionConfig = {
  tableId: string;
  key: 'main' | 'ex' | 'side';
  fallbackType: string;
};

const SECTION_CONFIGS: SectionConfig[] = [
  { tableId: 'monster_list', key: 'main', fallbackType: 'モンスター' },
  { tableId: 'spell_list', key: 'main', fallbackType: '魔法' },
  { tableId: 'trap_list', key: 'main', fallbackType: '罠' },
  { tableId: 'extra_list', key: 'ex', fallbackType: 'モンスター' },
  { tableId: 'side_list', key: 'side', fallbackType: 'モンスター' },
];

export function detectTypeFromIcon(iconSrc: string): string | null {
  if (iconSrc.includes('card_icon_effect')) return '効果モンスター';
  if (iconSrc.includes('card_icon_link')) return 'リンクモンスター';
  if (iconSrc.includes('card_icon_spell')) return '魔法';
  if (iconSrc.includes('card_icon_trap')) return '罠';
  return null;
}

/**
 * 保存したニューロンHTMLからインラインイベントハンドラと script タグを除去する。
 * これにより、DOMParser で解析する際や後続の操作中に CSP 違反が発生するのを防ぐ。
 */
export function sanitizeNeuronHtml(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
}

function extractDeckName(doc: Document): string {
  const titleMeta = doc.querySelector('meta[property="title"]');
  const titleContent = titleMeta?.getAttribute('content');
  if (titleContent) {
    return titleContent.split(' | ')[0]?.trim() || 'ニューロンデッキ';
  }
  const pageTitle = doc.querySelector('title')?.textContent;
  if (pageTitle) {
    return pageTitle.split(' | ')[0]?.trim() || 'ニューロンデッキ';
  }
  return 'ニューロンデッキ';
}

function buildImageMap(doc: Document): Map<string, string> {
  const map = new Map<string, string>();
  const images = doc.querySelectorAll('img');

  for (const img of images) {
    const className = img.getAttribute('class') || '';
    if (!/\bcard_image_\w+_\d+_1\b/.test(className)) continue;

    const src = img.getAttribute('src');
    if (!src || !src.includes('_files/get_image')) continue;

    const name = img.getAttribute('alt')?.trim() || img.getAttribute('title')?.trim();
    if (!name || map.has(name)) continue;

    map.set(name, src);
  }

  return map;
}

function extractCid(linkValue: string): string | null {
  const match = linkValue.match(/cid=(\d+)/);
  return match ? match[1] : null;
}

function parseCardRow(
  row: HTMLTableRowElement,
  imageMap: Map<string, string>,
  fallbackType: string,
): ParsedNeuronCard | null {
  const nameEl = row.querySelector('.card_name span');
  const numEl = row.querySelector('.num span');
  const linkEl = row.querySelector('.link_value') as HTMLInputElement | null;
  const iconEl = row.querySelector('.c_img img') as HTMLImageElement | null;

  if (!nameEl || !numEl) return null;

  const name = nameEl.textContent?.trim();
  if (!name) return null;

  const quantity = parseInt(numEl.textContent?.trim() || '1', 10) || 1;
  const iconSrc = iconEl?.getAttribute('src') || '';
  const type = detectTypeFromIcon(iconSrc) || fallbackType;

  const cid = extractCid(linkEl?.value || '');
  const id = cid ? `neuron_${cid}` : generateId('card_');

  const imageSrc = imageMap.get(name) ?? null;

  return { id, name, quantity, type, imageSrc };
}

export function parseNeuronHtml(html: string): ParsedNeuronDeck {
  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitizeNeuronHtml(html), 'text/html');

  const deckName = extractDeckName(doc);
  const imageMap = buildImageMap(doc);

  const result: ParsedNeuronDeck = {
    name: deckName,
    main: [],
    ex: [],
    side: [],
  };

  for (const config of SECTION_CONFIGS) {
    const table = doc.getElementById(config.tableId);
    if (!table) continue;

    const rows = table.querySelectorAll('tr');
    for (const row of rows) {
      // ヘッダー行はスキップ
      if (row.querySelector('th')) continue;

      const card = parseCardRow(row as HTMLTableRowElement, imageMap, config.fallbackType);
      if (card) {
        result[config.key].push(card);
      }
    }
  }

  return result;
}

export function buildComboDocumentFromParsedNeuron(data: ParsedNeuronDeck): ComboDocument {
  const catalogMap = new Map<string, { id: string; name: string; imageUrl: string; type: string }>();
  const deckEntries: DeckEntry[] = [];

  const addCards = (cards: ParsedNeuronCard[], section: 'main' | 'extra' | 'side') => {
    for (const card of cards) {
      if (!catalogMap.has(card.id)) {
        catalogMap.set(card.id, {
          id: card.id,
          name: card.name,
          imageUrl: '',
          type: card.type,
        });
      }

      deckEntries.push({
        cardId: card.id,
        quantity: card.quantity,
        section,
      });
    }
  };

  addCards(data.main, 'main');
  addCards(data.ex, 'extra');
  addCards(data.side, 'side');

  return {
    schemaVersion: 0,
    deck: {
      id: generateId('deck_'),
      name: data.name,
      source: {
        type: 'neuron',
        deckCode: '',
      },
      cards: deckEntries,
    },
    cardCatalog: Array.from(catalogMap.values()),
    routes: [],
  };
}
