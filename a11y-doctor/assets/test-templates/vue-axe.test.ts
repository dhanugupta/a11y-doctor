// Vue component accessibility test (Vitest + Testing Library + vitest-axe).
//   npm i -D vitest-axe @testing-library/vue
// Register the matcher once in your Vitest setup file:
//   import * as matchers from 'vitest-axe/matchers'; import { expect } from 'vitest'; expect.extend(matchers);
//   (TypeScript: also `import 'vitest-axe/extend-expect'` once.)
import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import SearchBox from './SearchBox.vue';

const WCAG22_AA = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
  rules: { 'color-contrast': { enabled: false }, 'target-size': { enabled: false } }, // jsdom has no layout
};

test('search box is named and has no violations', async () => {
  const { container } = render(SearchBox);
  expect(screen.getByRole('searchbox', { name: /search/i })).toBeTruthy();
  expect(await axe(container, WCAG22_AA)).toHaveNoViolations();
});

test('clear button is keyboard operable', async () => {
  const user = userEvent.setup();
  render(SearchBox);
  await user.type(screen.getByRole('searchbox', { name: /search/i }), 'shoes');
  await user.tab();
  expect(screen.getByRole('button', { name: /clear search/i })).toHaveFocus();
  await user.keyboard('{Enter}');
  expect((screen.getByRole('searchbox', { name: /search/i }) as HTMLInputElement).value).toBe('');
});
