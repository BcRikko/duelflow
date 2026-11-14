import { generateId } from '../../../shared/id';
import type { ComboDocument, DeckEntry } from '../../combo/model/types';

export type ParsedNeuronCard = {
  id: string;
  name: string;
  quantity: number;
  type: string;
  imageSrc: string | null;
  description: string;
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

function cleanText(text: string | undefined | null): string {
  return text?.replace(/\s+/g, ' ').replace(/\[\s+/g, '[').replace(/\s+\]/g, ']').trim() ?? '';
}

function parseCardDescription(container: Element): string {
  const attribute = cleanText(container.querySelector('.box_card_attribute span')?.textContent);
  const levelRank = cleanText(container.querySelector('.box_card_level_rank span')?.textContent);
  const species = cleanText(container.querySelector('.card_info_species_and_other_item span')?.textContent);
  const atk = cleanText(container.querySelector('.atk_power span')?.textContent);
  const def = cleanText(container.querySelector('.def_power span')?.textContent);
  const effect = cleanText(container.querySelector('.box_card_text')?.textContent);

  const specs: string[] = [];
  if (attribute) specs.push(attribute);
  if (levelRank) specs.push(levelRank);
  if (species) specs.push(species);
  if (atk || def) {
    specs.push(atk && def ? `${atk} / ${def}` : atk || def);
  }

  if (!effect && specs.length === 0) return '';
  return specs.length > 0 ? `${specs.join(' / ')}\n\n${effect}` : effect;
}

function buildDescriptionMap(doc: Document): Map<string, string> {
  const map = new Map<string, string>();
  const containers = doc.querySelectorAll('.t_row.c_normal');

  for (const container of containers) {
    const cidInput = container.querySelector('.remove_btn input.cid') as HTMLInputElement | null;
    const cid = cidInput?.value?.trim();
    if (!cid) continue;

    const description = parseCardDescription(container);
    if (description) {
      map.set(cid, description);
    }
  }

  return map;
}

function getTextContent(element: Element | null): string | undefined {
  return element?.textContent?.trim();
}

function extractName(row: HTMLTableRowElement): string | null {
  const selectors = ['.card_name span', '.card_name a', '.card_name'];
  for (const selector of selectors) {
    const text = getTextContent(row.querySelector(selector));
    if (text) return text;
  }
  return null;
}

function extractQuantity(row: HTMLTableRowElement): number {
  const selectors = ['.num span', '.num'];
  for (const selector of selectors) {
    const text = getTextContent(row.querySelector(selector));
    if (text) {
      const parsed = parseInt(text, 10);
      if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    }
  }
  return 1;
}

function extractCidFromRow(row: HTMLTableRowElement): string | null {
  const linkEl = row.querySelector('.link_value') as HTMLInputElement | null;
  const fromValue = extractCid(linkEl?.value || '');
  if (fromValue) return fromValue;

  const dataCid = row.getAttribute('data-cid');
  if (dataCid) return dataCid;

  const anyCid = row.querySelector('[data-cid]');
  return anyCid?.getAttribute('data-cid') ?? null;
}

function parseCardRow(
  row: HTMLTableRowElement,
  imageMap: Map<string, string>,
  descriptionMap: Map<string, string>,
  fallbackType: string,
): ParsedNeuronCard | null {
  const name = extractName(row);
  if (!name) return null;

  const quantity = extractQuantity(row);

  const iconSelectors = ['.c_img img', 'img[src*="card_icon_"]'];
  let iconSrc = '';
  for (const selector of iconSelectors) {
    const el = row.querySelector(selector) as HTMLImageElement | null;
    const src = el?.getAttribute('src');
    if (src) {
      iconSrc = src;
      break;
    }
  }
  const type = detectTypeFromIcon(iconSrc) || fallbackType;

  const cid = extractCidFromRow(row);
  const id = cid ? `neuron_${cid}` : generateId('card_');

  const imageSrc = imageMap.get(name) ?? null;
  const description = cid ? descriptionMap.get(cid) ?? '' : '';

  return { id, name, quantity, type, imageSrc, description };
}

export function parseNeuronHtml(html: string): ParsedNeuronDeck {
  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitizeNeuronHtml(html), 'text/html');

  const deckName = extractDeckName(doc);
  const imageMap = buildImageMap(doc);
  const descriptionMap = buildDescriptionMap(doc);

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

      const card = parseCardRow(row as HTMLTableRowElement, imageMap, descriptionMap, config.fallbackType);
      if (card) {
        result[config.key].push(card);
      }
    }
  }

  return result;
}

export function buildComboDocumentFromParsedNeuron(data: ParsedNeuronDeck): ComboDocument {
  const catalogMap = new Map<
    string,
    { id: string; name: string; imageUrl: string; type: string; description: string }
  >();
  const deckEntries: DeckEntry[] = [];

  const addCards = (cards: ParsedNeuronCard[], section: 'main' | 'extra' | 'side') => {
    for (const card of cards) {
      if (!catalogMap.has(card.id)) {
        catalogMap.set(card.id, {
          id: card.id,
          name: card.name,
          imageUrl: '',
          type: card.type,
          description: card.description,
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
