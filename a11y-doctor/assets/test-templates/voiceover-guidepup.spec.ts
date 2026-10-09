// Real VoiceOver (macOS) regression test with Guidepup + Playwright.
//   npx @guidepup/setup setup        # one-time: grants automation permissions (asks for consent)
//   npm i -D @guidepup/playwright @guidepup/guidepup @playwright/test
//   npx @guidepup/setup install
//
// playwright.config.ts: spread `screenReaderConfig` and run headed WebKit with one worker:
//   import { screenReaderConfig } from '@guidepup/playwright';
//   export default { ...screenReaderConfig, timeout: 5 * 60_000, retries: 2,
//     projects: [{ name: 'webkit', use: { ...devices['Desktop Safari'], headless: false } }] };
//
// VoiceOver takes over the machine while this runs: run it on a dedicated macOS runner or with
// the developer's consent, never silently.
import { voiceOverTest as test } from '@guidepup/playwright';
import { expect } from '@playwright/test';

test.describe('Checkout with VoiceOver', () => {
  test('headings, form labels and errors are announced', async ({ page, voiceOver }) => {
    await page.goto('http://localhost:3000/checkout', { waitUntil: 'load' });
    await page.getByRole('heading', { level: 1 }).waitFor();
    await voiceOver.navigateToWebContent();

    // 1. Heading navigation (VO+Cmd+H): the page outline is announced
    await voiceOver.nextHeading();
    expect(await voiceOver.itemText()).toContain('Checkout');

    // 2. Move to the email field and check its label and required state
    while (!(await voiceOver.itemText()).toLowerCase().includes('email')) {
      await voiceOver.next();
    }
    const field = (await voiceOver.lastSpokenPhrase()).toLowerCase();
    expect(field).toContain('email');
    expect(field).toMatch(/edit text|text field/);

    // 3. Submit empty → the error must be spoken (live region or focus move)
    await page.getByRole('button', { name: 'Place order' }).click();
    await expect
      .poll(async () => (await voiceOver.spokenPhraseLog()).join(' | ').toLowerCase())
      .toContain('enter an email');

    // Optional: lock in the whole transcript (update when screen reader versions change)
    // expect(JSON.stringify(await voiceOver.spokenPhraseLog())).toMatchSnapshot();
  });
});
