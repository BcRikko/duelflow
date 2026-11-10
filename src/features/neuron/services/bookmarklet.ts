/**
 * ニューロンのデッキ詳細ページからデッキ情報を抽出し、
 * インポート用の JSON をクリップボードにコピーするブックマークレット。
 */

const BOOKMARKLET_SCRIPT = String.raw`
(function () {
  function generateId(prefix) {
    return prefix + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return Promise.reject(new Error('Clipboard API not available'));
  }

  function fallbackCopy(text) {
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    var success = false;
    try {
      success = document.execCommand('copy');
    } catch (e) {
      success = false;
    }

    document.body.removeChild(textarea);
    return success ? Promise.resolve() : Promise.reject(new Error('execCommand failed'));
  }

  function showCopyModal(text) {
    var overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'rgba(0,0,0,0.5)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '999999';

    var box = document.createElement('div');
    box.style.background = '#fff';
    box.style.padding = '20px';
    box.style.borderRadius = '8px';
    box.style.width = '500px';
    box.style.maxWidth = '90%';

    var title = document.createElement('h3');
    title.textContent = 'JSONをコピーしてください';
    title.style.marginTop = '0';

    var desc = document.createElement('p');
    desc.textContent = '以下のJSONを全選択してコピーし、DuelFlowアプリに貼り付けてください。';

    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.width = '100%';
    textarea.style.height = '200px';
    textarea.style.fontFamily = 'monospace';
    textarea.style.fontSize = '12px';

    var closeBtn = document.createElement('button');
    closeBtn.textContent = '閉じる';
    closeBtn.style.marginTop = '10px';
    closeBtn.style.padding = '8px 16px';
    closeBtn.onclick = function () {
      document.body.removeChild(overlay);
    };

    box.appendChild(title);
    box.appendChild(desc);
    box.appendChild(textarea);
    box.appendChild(closeBtn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    textarea.focus();
    textarea.select();
  }

  const titleMeta = document.querySelector('meta[property="title"]');
  const deckName = titleMeta?.content?.split(' | ')[0]?.trim() || 'ニューロンデッキ';

  const sectionConfigs = [
    { selector: '#monster_list', key: 'main' },
    { selector: '#spell_list', key: 'main' },
    { selector: '#trap_list', key: 'main' },
    { selector: '#extra_list', key: 'ex' },
    { selector: '#side_list', key: 'side' },
  ];

  function detectTypeFromIcon(iconSrc) {
    if (!iconSrc) return '';
    if (iconSrc.includes('card_icon_effect')) return '効果モンスター';
    if (iconSrc.includes('card_icon_link')) return 'リンクモンスター';
    if (iconSrc.includes('card_icon_spell')) return '魔法';
    if (iconSrc.includes('card_icon_trap')) return '罠';
    return '';
  }

  const result = {
    main: [],
    ex: [],
    side: [],
  };

  for (const config of sectionConfigs) {
    const table = document.querySelector(config.selector);
    if (!table) continue;

    const rows = table.querySelectorAll('tr');
    for (const row of rows) {
      const nameEl = row.querySelector('.card_name span');
      const numEl = row.querySelector('.num span');
      const linkEl = row.querySelector('.link_value');
      const iconEl = row.querySelector('.c_img img');

      if (!nameEl || !numEl) continue;

      const name = nameEl.textContent.trim();
      const quantity = parseInt(numEl.textContent.trim(), 10) || 1;
      const type = detectTypeFromIcon(iconEl?.src);

      let cardId = null;
      const linkValue = linkEl?.value || '';
      const cidMatch = linkValue.match(/cid=(\d+)/);
      if (cidMatch) {
        cardId = 'neuron_' + cidMatch[1];
      }

      if (!cardId) {
        cardId = generateId('card_');
      }

      result[config.key].push({
        id: cardId,
        name: name,
        quantity: quantity,
        type: type,
        imageUrl: '',
      });
    }
  }

  const totalCards = result.main.length + result.ex.length + result.side.length;

  if (totalCards === 0) {
    alert('デッキ情報が見つかりませんでした。テキスト表示（リスト）に切り替えてから試してください。');
    return;
  }

  const doc = {
    deck: {
      id: generateId('deck_'),
      name: deckName,
      main: result.main,
      ex: result.ex,
      side: result.side,
    },
  };

  const json = JSON.stringify(doc, null, 2);

  copyToClipboard(json)
    .then(function () {
      alert('デッキ情報をJSONとしてコピーしました。DuelFlowアプリに貼り付けてください。カード枚数: ' + totalCards);
    })
    .catch(function () {
      fallbackCopy(json)
        .then(function () {
          alert('デッキ情報をJSONとしてコピーしました。DuelFlowアプリに貼り付けてください。カード枚数: ' + totalCards);
        })
        .catch(function () {
          showCopyModal(json);
        });
    });
})();
`;

export function generateBookmarkletHref(): string {
  return `javascript:${encodeURIComponent(BOOKMARKLET_SCRIPT.trim())}`;
}

export function generateBookmarkletCode(): string {
  return `javascript:${BOOKMARKLET_SCRIPT.trim()}`;
}
