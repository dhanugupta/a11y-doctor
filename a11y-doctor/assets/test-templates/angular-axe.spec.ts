// Angular component accessibility test (TestBed + axe-core).
//   npm i -D axe-core
// Works in Karma/Jasmine (real browser: contrast is checked too) and in Jest/Vitest (jsdom:
// contrast and target-size are disabled below because jsdom has no layout).
import { TestBed } from '@angular/core/testing';
import axe from 'axe-core';
import { ToolbarComponent } from './toolbar.component';

const WCAG22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const inJsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);

async function axeViolations(el: HTMLElement) {
  const { violations } = await axe.run(el, {
    runOnly: { type: 'tag', values: WCAG22_AA },
    rules: inJsdom ? { 'color-contrast': { enabled: false }, 'target-size': { enabled: false } } : {},
  });
  return violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
}

describe('ToolbarComponent accessibility', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ToolbarComponent] }).compileComponents();
  });

  it('has no WCAG 2.2 A/AA violations', async () => {
    const fixture = TestBed.createComponent(ToolbarComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(await axeViolations(fixture.nativeElement)).toEqual([]);
  });

  it('exposes named buttons', () => {
    const fixture = TestBed.createComponent(ToolbarComponent);
    fixture.detectChanges();
    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    for (const b of buttons) {
      const name = b.getAttribute('aria-label') ?? b.textContent?.trim();
      expect(name).withContext(b.outerHTML).toBeTruthy(); // Jest: expect(name).toBeTruthy()
    }
  });
});
