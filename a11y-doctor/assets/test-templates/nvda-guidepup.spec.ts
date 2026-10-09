// Real NVDA (Windows) regression test with Guidepup + Playwright.
// Setup as in voiceover-guidepup.spec.ts (`npx @guidepup/setup` installs a portable NVDA).
// playwright.config.ts: ...screenReaderConfig, headed Chromium or Firefox, one worker.
import { nvdaTest as test } from '@guidepup/playwright';
import { expect } from '@playwright/test';

test.describe('Account menu with NVDA', () => {
  test('menu button state and items are announced', async ({ page, nvda }) => {
    await page.goto('http://localhost:3000/', { waitUntil: 'load' });
    await page.getByRole('navigation').first().waitFor();
    await nvda.navigateToWebContent();

    // Tab to the menu button: expect name, role, collapsed state
    const trigger = page.getByRole('button', { name: 'Account' });
    while (!(await nvda.lastSpokenPhrase()).includes('Account')) {
      await nvda.press('Tab');
    }
    const spoken = (await nvda.lastSpokenPhrase()).toLowerCase();
    expect(spoken).toContain('button');
    expect(spoken).toContain('collapsed');

    // Open it: NVDA must switch to focus mode and announce the first item
    await nvda.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect((await nvda.lastSpokenPhrase()).toLowerCase()).toContain('menu item');

    // Escape closes and returns focus to the trigger
    await nvda.press('Escape');
    await expect(trigger).toBeFocused();
  });
});
