import { describe, expect, it } from 'vitest';
import {
  buildComboDocumentFromParsedNeuron,
  detectTypeFromIcon,
  parseNeuronHtml,
  sanitizeNeuronHtml,
} from './parseNeuronHtml';

function createMinimalHtml(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta property="title" content="テストデッキ | 遊戯王 デッキレシピ 詳細 | 遊戯王ニューロン">
</head>
<body>
  <table id="monster_list" class="deck_list">
    <tr><th colspan="3">モンスターカード</th><th class="num"><span>2</span></th></tr>
    <tr>
      <td class="row_num">1</td>
      <td class="c_img"><img src="./test_files/card_icon_effect.png"></td>
      <td class="card_name">
        <div class="icon"><span>テストモンスター</span></div>
        <input type="hidden" class="link_value" value="/yugiohdb/card_search.action?ope=2&amp;cid=12345&amp;request_locale=ja">
      </td>
      <td class="num"><span>1</span></td>
    </tr>
  </table>
  <table id="spell_list" class="deck_list">
    <tr><th colspan="3">魔法カード</th><th class="num"><span>1</span></th></tr>
    <tr>
      <td class="row_num">1</td>
      <td class="c_img"><img src="./test_files/card_icon_spell.png"></td>
      <td class="card_name">
        <div class="icon"><span>テスト魔法</span></div>
        <input type="hidden" class="link_value" value="/yugiohdb/card_search.action?ope=2&amp;cid=67890&amp;request_locale=ja">
      </td>
      <td class="num"><span>1</span></td>
    </tr>
  </table>
  <img class="card_image_monster_0_1" alt="テストモンスター" src="./test_files/get_image(0).action.ダウンロード">
  <img class="card_image_spell_0_1" alt="テスト魔法" src="./test_files/get_image(1).action.ダウンロード">
  <div class="t_row c_normal">
    <dl>
      <dd class="box_card_name flex_1 top_set">
        <span class="card_name">テストモンスター</span>
      </dd>
      <dd class="box_card_spec flex_1">
        <span class="box_card_attribute">
          <img src="./attribute_icon_dark.png" alt="DARK">
          <span>DARK</span>
        </span>
        <span class="box_card_level_rank level">
          <span>Level 4</span>
        </span>
        <span class="card_info_species_and_other_item"><span>[ Spellcaster / Effect ]</span></span>
        <div class="atkdef">
          <span class="atk_power"><span>ATK 1500</span></span>
          <span class="def_power"><span>DEF 1000</span></span>
        </div>
      </dd>
      <dd class="box_card_text c_text flex_1 text_linebreak">ドローした時に発動できる。</dd>
    </dl>
    <div class="remove_btn top_set">
      <input type="hidden" class="cid" value="12345">
    </div>
  </div>
</body>
</html>
  `;
}

describe('sanitizeNeuronHtml', () => {
  it('インラインイベントハンドラを削除する', () => {
    const html = '<div onclick="alert(1)" onload="alert(2)">test</div>';
    expect(sanitizeNeuronHtml(html)).toBe('<div>test</div>');
  });

  it('script タグを削除する', () => {
    const html = '<div><script>alert(1)</script>test</div>';
    expect(sanitizeNeuronHtml(html)).toBe('<div>test</div>');
  });

  it('通常の属性は残す', () => {
    const html = '<img src="./icon.png" alt="icon">';
    expect(sanitizeNeuronHtml(html)).toBe('<img src="./icon.png" alt="icon">');
  });
});

describe('detectTypeFromIcon', () => {
  it.each([
    ['./card_icon_effect.png', '効果モンスター'],
    ['./card_icon_link.png', 'リンクモンスター'],
    ['./card_icon_spell.png', '魔法'],
    ['./card_icon_trap.png', '罠'],
    ['./unknown.png', null],
  ])('%s -> %s', (src, expected) => {
    expect(detectTypeFromIcon(src)).toBe(expected);
  });
});

describe('parseNeuronHtml', () => {
  it('デッキ名とカード情報を抽出する', () => {
    const result = parseNeuronHtml(createMinimalHtml());

    expect(result.name).toBe('テストデッキ');
    expect(result.main).toHaveLength(2);
    expect(result.main[0]).toEqual({
      id: 'neuron_12345',
      name: 'テストモンスター',
      quantity: 1,
      type: '効果モンスター',
      imageSrc: './test_files/get_image(0).action.ダウンロード',
      description: 'DARK / Level 4 / [Spellcaster / Effect] / ATK 1500 / DEF 1000\n\nドローした時に発動できる。',
    });
    expect(result.main[1]).toEqual({
      id: 'neuron_67890',
      name: 'テスト魔法',
      quantity: 1,
      type: '魔法',
      imageSrc: './test_files/get_image(1).action.ダウンロード',
      description: '',
    });
  });

  it('画像がないカードは imageSrc が null になる', () => {
    const html = createMinimalHtml().replace('card_image_monster_0_1', 'no_image');
    const result = parseNeuronHtml(html);

    expect(result.main[0].imageSrc).toBeNull();
  });
});

describe('buildComboDocumentFromParsedNeuron', () => {
  it('ParsedNeuronDeck から ComboDocument を生成する', () => {
    const doc = buildComboDocumentFromParsedNeuron({
      name: 'テストデッキ',
      main: [
        {
          id: 'neuron_12345',
          name: 'テストモンスター',
          quantity: 2,
          type: '効果モンスター',
          imageSrc: null,
          description: 'DARK / Level 4 / ATK 1500 / DEF 1000\n\nテスト効果',
        },
      ],
      ex: [],
      side: [],
    });

    expect(doc.schemaVersion).toBe(0);
    expect(doc.deck.name).toBe('テストデッキ');
    expect(doc.cardCatalog).toHaveLength(1);
    expect(doc.cardCatalog[0]).toEqual({
      id: 'neuron_12345',
      name: 'テストモンスター',
      imageUrl: '',
      type: '効果モンスター',
      description: 'DARK / Level 4 / ATK 1500 / DEF 1000\n\nテスト効果',
    });
    expect(doc.deck.cards).toEqual([{ cardId: 'neuron_12345', quantity: 2, section: 'main' }]);
  });
});
