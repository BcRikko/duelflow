import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { parseNeuronHtml } from './parseNeuronHtml';

describe.skip('parseNeuronHtml with real HTML', () => {
  it('parses the fetched Neuron deck page (en)', () => {
    const html = readFileSync('/tmp/neuron_deck.html', 'utf8');
    const result = parseNeuronHtml(html);
    console.log('deck name:', result.name);
    console.log('main:', result.main.length);
    console.log('extra:', result.ex.length);
    console.log('side:', result.side.length);
    expect(result.main.length).toBeGreaterThan(0);
  });

  it('parses the fetched Neuron deck page (ja)', () => {
    const html = readFileSync('/tmp/neuron_deck_ja.html', 'utf8');
    const result = parseNeuronHtml(html);
    console.log('ja deck name:', result.name);
    console.log('ja main:', result.main.length);
    console.log('ja extra:', result.ex.length);
    console.log('ja side:', result.side.length);
    expect(result.main.length).toBeGreaterThan(0);
  });
});
