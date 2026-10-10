import { Locator } from '@playwright/test';

/**
 * Selects an <option> within `selectLocator` by matching its visible text
 * against `textPattern`, resolving the option's real `value` attribute
 * first rather than assuming a hardcoded value or index.
 *
 * Needed throughout this suite because every dynamic dropdown here builds
 * option labels at runtime (e.g. "{name} ({duration}m, {marks} pts)" for
 * exam patterns, "{name} ({code})" for courses) - Playwright's own
 * selectOption({ label }) only accepts an exact literal string, not a
 * regex, so it can't match these directly.
 */
export async function selectOptionByText(selectLocator: Locator, textPattern: RegExp) {
  const option = selectLocator.locator('option').filter({ hasText: textPattern }).first();
  const value = await option.getAttribute('value');
  if (!value) {
    throw new Error(`No <option> matching ${textPattern} found in select, or it has no value attribute`);
  }
  await selectLocator.selectOption(value);
}

/**
 * Finds a <select> by locating its adjacent <label> text and walking to
 * the shared parent - this codebase's form fields use plain <label> tags
 * with no htmlFor/id association, so getByLabel() doesn't work here.
 * Every field in this app follows the same <div><label/><select/></div>
 * (or <input/>) structure, confirmed directly against source.
 */
export function selectNearLabel(page: import('@playwright/test').Page, labelText: string | RegExp) {
  return page.getByText(labelText).locator('..').locator('select');
}
