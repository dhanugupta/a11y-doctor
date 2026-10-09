// Page-level accessibility regression tests (Playwright + axe-core, WCAG 2.2 A/AA).
//   npm i -D @playwright/test @axe-core/playwright
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const WCAG22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoViolations(page: Page, include?: string) {
  let builder = new AxeBuilder({ page }).withTags(WCAG22_AA);
  if (include) builder = builder.include(include);
  const { violations } = await builder.analyze();
  // Readable failure output: rule id + offending selectors
  expect(violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
}

// Critical user journeys first
for (const path of ['/', '/login', '/search?q=shoes', '/checkout']) {
  test(`a11y ${path}`, async ({ page }) => {
    await page.goto(path);
    await expectNoViolations(page);
  });
}

test('a11y: navigation menu open state', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await expectNoViolations(page, 'nav');
});

test('keyboard: dialog traps and restores focus', async ({ page }) => {
  await page.goto('/settings');
  const trigger = page.getByRole('button', { name: 'Delete account' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: /delete account/i });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(':focus')).toHaveCount(1);       // focus moved inside
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();                         // focus restored
});

test('focus not obscured by sticky header (2.4.11)', async ({ page }) => {
  await page.goto('/');
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    const hidden = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return false;
      const r = el.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return !!top && !el.contains(top) && !top.contains(el);
    });
    expect(hidden, `focused element #${i + 1} is covered`).toBe(false);
  }
});
