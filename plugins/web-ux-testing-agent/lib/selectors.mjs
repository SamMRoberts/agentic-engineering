// Build Playwright locator expressions from structured selector objects, and
// classify selector quality. Accessible-first: getByRole/getByLabel/getByText/
// getByTestId are preferred; css/xpath are flagged as brittle.

const ACCESSIBLE_STRATEGIES = ["role", "label", "text", "placeholder", "test_id"];

/** Escape a JS string literal for safe code generation. */
export function jsString(value) {
  return JSON.stringify(String(value));
}

/** Does this selector use only accessible strategies? */
export function isAccessible(selector) {
  if (!selector || typeof selector !== "object") return false;
  if (selector.css || selector.xpath) return false;
  return ACCESSIBLE_STRATEGIES.some((s) => selector[s] != null);
}

/** Is this selector empty / unresolvable? */
export function isEmptySelector(selector) {
  if (!selector || typeof selector !== "object") return true;
  const keys = ["role", "label", "text", "placeholder", "test_id", "css", "xpath"];
  return !keys.some((k) => selector[k] != null);
}

/**
 * Build a Playwright locator chain (as source code) from a selector object.
 * `base` is the locator root expression, defaulting to "page".
 */
export function buildLocator(selector, base = "page") {
  if (isEmptySelector(selector)) {
    throw new Error("Selector has no usable strategy");
  }

  // Scope inside a parent locator first.
  let root = base;
  if (selector.within && !isEmptySelector(selector.within)) {
    root = buildLocator(selector.within, base);
  }

  let expr;
  if (selector.role != null) {
    const opts = {};
    if (selector.name != null) opts.name = selector.name;
    if (selector.exact != null) opts.exact = selector.exact;
    expr = `${root}.getByRole(${jsString(selector.role)}${
      Object.keys(opts).length ? `, ${roleOptions(opts)}` : ""
    })`;
  } else if (selector.label != null) {
    expr = `${root}.getByLabel(${jsString(selector.label)}${exactSuffix(selector)})`;
  } else if (selector.placeholder != null) {
    expr = `${root}.getByPlaceholder(${jsString(selector.placeholder)}${exactSuffix(selector)})`;
  } else if (selector.text != null) {
    expr = `${root}.getByText(${jsString(selector.text)}${exactSuffix(selector)})`;
  } else if (selector.test_id != null) {
    expr = `${root}.getByTestId(${jsString(selector.test_id)})`;
  } else if (selector.css != null) {
    expr = `${root}.locator(${jsString(selector.css)})`;
  } else if (selector.xpath != null) {
    expr = `${root}.locator(${jsString("xpath=" + selector.xpath)})`;
  } else {
    throw new Error("Selector has no usable strategy");
  }

  if (Number.isInteger(selector.nth)) {
    expr = `${expr}.nth(${selector.nth})`;
  }
  return expr;
}

function exactSuffix(selector) {
  return selector.exact != null ? `, { exact: ${selector.exact === true} }` : "";
}

function roleOptions(opts) {
  const parts = [];
  if (opts.name != null) parts.push(`name: ${jsString(opts.name)}`);
  if (opts.exact != null) parts.push(`exact: ${opts.exact === true}`);
  return `{ ${parts.join(", ")} }`;
}
