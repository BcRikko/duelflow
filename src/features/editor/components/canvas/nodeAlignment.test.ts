import { describe, expect, it } from 'vitest';
import {
  alignCenterX,
  alignCenterY,
  distributeHorizontally,
  distributeVertically,
} from './nodeAlignment';

function node(id: string, x: number, y: number, width = 240, height = 80) {
  return { id, position: { x, y }, width, height };
}

describe('nodeAlignment', () => {
  describe('alignCenterX', () => {
    it('選択範囲の左右中央に centerX を揃える', () => {
      const nodes = [node('a', 0, 0, 200), node('b', 300, 100, 200)];
      const result = alignCenterX(nodes);
      // bounds: left=0, right=500 -> centerX=250, width=200 -> x=150
      expect(result.get('a')?.x).toBe(150);
      expect(result.get('b')?.x).toBe(150);
      expect(result.get('a')?.y).toBe(0);
      expect(result.get('b')?.y).toBe(100);
    });

    it('1件以下のときは何もしない', () => {
      expect(alignCenterX([node('a', 10, 20)]).size).toBe(0);
      expect(alignCenterX([]).size).toBe(0);
    });
  });

  describe('alignCenterY', () => {
    it('選択範囲の上下中央に centerY を揃える', () => {
      const nodes = [node('a', 0, 0, 240, 80), node('b', 100, 200, 240, 80)];
      const result = alignCenterY(nodes);
      expect(result.get('a')?.y).toBe(100); // (0 + 280)/2 - 80/2
      expect(result.get('b')?.y).toBe(100);
      expect(result.get('a')?.x).toBe(0);
      expect(result.get('b')?.x).toBe(100);
    });
  });

  describe('distributeHorizontally', () => {
    it('左右の端を固定して間隔を均等にする', () => {
      const nodes = [
        node('a', 0, 0, 100),
        node('b', 100, 0, 100),
        node('c', 200, 0, 100),
      ];
      const result = distributeHorizontally(nodes);
      expect(result.get('a')?.x).toBe(0);
      expect(result.get('c')?.x).toBe(200);
      expect(result.get('b')?.x).toBe(100);
    });

    it('2件以下のときは何もしない', () => {
      expect(distributeHorizontally([node('a', 0, 0), node('b', 100, 0)]).size).toBe(0);
    });
  });

  describe('distributeVertically', () => {
    it('上下の端を固定して間隔を均等にする', () => {
      const nodes = [
        node('a', 0, 0, 240, 50),
        node('b', 0, 100, 240, 50),
        node('c', 0, 200, 240, 50),
      ];
      const result = distributeVertically(nodes);
      expect(result.get('a')?.y).toBe(0);
      expect(result.get('c')?.y).toBe(200);
      expect(result.get('b')?.y).toBe(100);
    });

    it('2件以下のときは何もしない', () => {
      expect(distributeVertically([node('a', 0, 0), node('b', 0, 100)]).size).toBe(0);
    });
  });
});
