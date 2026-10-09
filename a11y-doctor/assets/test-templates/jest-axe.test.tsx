// Component-level accessibility regression test (React + Testing Library + jest-axe).
//   npm i -D jest-axe @types/jest-axe @testing-library/react @testing-library/user-event
// Vitest: use `vitest-axe` — see vue-axe.test.ts for the matcher setup (expect.extend(matchers)).
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ActionsMenu } from './ActionsMenu';

expect.extend(toHaveNoViolations);

const WCAG22_AA = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
  // jsdom has no layout/CSS: contrast and target size must be tested in a real browser (Playwright)
  rules: { 'color-contrast': { enabled: false }, 'target-size': { enabled: false } },
};

describe('ActionsMenu accessibility', () => {
  it('has no violations when closed', async () => {
    const { container } = render(<ActionsMenu />);
    expect(await axe(container, WCAG22_AA)).toHaveNoViolations();
  });

  it('has no violations when open', async () => {
    const user = userEvent.setup();
    const { container } = render(<ActionsMenu />);
    await user.click(screen.getByRole('button', { name: 'Actions' }));
    expect(await axe(container, WCAG22_AA)).toHaveNoViolations();
  });

  it('is operable with the keyboard and restores focus', async () => {
    const user = userEvent.setup();
    render(<ActionsMenu />);
    const trigger = screen.getByRole('button', { name: 'Actions' });

    await user.tab();
    expect(trigger).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(screen.getByRole('menu')).toBeVisible();
    expect(screen.getAllByRole('menuitem')[0]).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
