/**
 * Test setup file for Bun test runner
 * Registers jest-dom matchers and sets up DOM environment
 */

// Register jest-dom matchers for Bun test
import "@testing-library/jest-dom/jest-globals";

// Set up DOM environment using JSDOM
const { JSDOM } = await import("jsdom");

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost",
  pretendToBeVisual: true,
});

// Override global objects to match browser environment (using type assertions for TS)
const win = dom.window as unknown as Window & typeof globalThis;
(globalThis as unknown as Record<string, unknown>).window = win;
(globalThis as unknown as Record<string, unknown>).self = win;
(globalThis as unknown as Record<string, unknown>).document = win.document;
(globalThis as unknown as Record<string, unknown>).navigator = win.navigator;
(globalThis as unknown as Record<string, unknown>).HTMLElement = win.HTMLElement;
(globalThis as unknown as Record<string, unknown>).Element = win.Element;
(globalThis as unknown as Record<string, unknown>).Node = win.Node;
(globalThis as unknown as Record<string, unknown>).Text = win.Text;
(globalThis as unknown as Record<string, unknown>).Comment = win.Comment;
(globalThis as unknown as Record<string, unknown>).DocumentFragment = win.DocumentFragment;
(globalThis as unknown as Record<string, unknown>).Range = win.Range;
(globalThis as unknown as Record<string, unknown>).Event = win.Event;
(globalThis as unknown as Record<string, unknown>).MouseEvent = win.MouseEvent;
(globalThis as unknown as Record<string, unknown>).KeyboardEvent = win.KeyboardEvent;
(globalThis as unknown as Record<string, unknown>).CustomEvent = win.CustomEvent;
(globalThis as unknown as Record<string, unknown>).MutationObserver = win.MutationObserver;
(globalThis as unknown as Record<string, unknown>).CSSStyleDeclaration = win.CSSStyleDeclaration;
(globalThis as unknown as Record<string, unknown>).getComputedStyle = win.getComputedStyle;
(globalThis as unknown as Record<string, unknown>).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 16) as unknown as number;
(globalThis as unknown as Record<string, unknown>).cancelAnimationFrame = (id: number) => clearTimeout(id);
