import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Reads the real tokens from the stylesheet, so a palette change can't quietly break contrast.
const css = readFileSync("app/globals.css", "utf8");
const token = (name: string) => {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --color-${name} not found`);
  return m[1];
};

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Body-size text everywhere it appears: WCAG AA needs 4.5:1.
const TEXT = ["ink", "ink-2", "ink-3", "ink-4", "ok", "warn", "crit", "info", "accent"];
const SURFACES = ["void", "surface", "surface-2", "surface-3"];

describe("case-file palette contrast (WCAG AA, 4.5:1)", () => {
  for (const fg of TEXT)
    for (const bg of SURFACES)
      it(`${fg} on ${bg}`, () => {
        expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
      });

  // Stamp and badge text sits on its own tinted background.
  for (const [fg, bg] of [
    ["ok", "ok-dim"],
    ["warn", "warn-dim"],
    ["crit", "crit-dim"],
    ["info", "info-dim"],
    ["accent", "accent-dim"],
  ])
    it(`${fg} on ${bg}`, () => {
      expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
    });
});
