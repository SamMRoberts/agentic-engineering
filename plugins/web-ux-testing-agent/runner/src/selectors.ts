// Re-export accessible-first locator helpers.
import type { Selector } from "./types.js";
import {
  buildLocator as build,
  isAccessible as accessible,
  isEmptySelector as empty
} from "../../lib/selectors.mjs";

export function buildLocator(selector: Selector, base = "page"): string {
  return build(selector, base);
}
export function isAccessible(selector: Selector): boolean {
  return accessible(selector);
}
export function isEmptySelector(selector: Selector): boolean {
  return empty(selector);
}
