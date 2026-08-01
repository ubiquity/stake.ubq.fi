import { afterEach } from "bun:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  pretendToBeVisual: true,
  url: "http://localhost",
});

const win = dom.window as unknown as Window & typeof globalThis;
const globals: Record<string, unknown> = {
  window: win,
  self: win,
  document: win.document,
  navigator: win.navigator,
  HTMLElement: win.HTMLElement,
  HTMLButtonElement: win.HTMLButtonElement,
  HTMLInputElement: win.HTMLInputElement,
  Element: win.Element,
  Node: win.Node,
  Text: win.Text,
  Comment: win.Comment,
  DocumentFragment: win.DocumentFragment,
  Range: win.Range,
  Event: win.Event,
  MouseEvent: win.MouseEvent,
  KeyboardEvent: win.KeyboardEvent,
  CustomEvent: win.CustomEvent,
  MutationObserver: win.MutationObserver,
  CSSStyleDeclaration: win.CSSStyleDeclaration,
  getComputedStyle: win.getComputedStyle.bind(win),
  requestAnimationFrame: (callback: FrameRequestCallback) => setTimeout(callback, 16) as unknown as number,
  cancelAnimationFrame: (id: number) => clearTimeout(id),
};

for (const [key, value] of Object.entries(globals)) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value,
    writable: true,
  });
}

const { cleanup } = await import("@testing-library/react");

afterEach(() => {
  cleanup();
});
