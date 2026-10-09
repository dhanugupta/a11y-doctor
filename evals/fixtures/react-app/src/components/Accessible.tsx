// Clean component: should produce zero findings.
// <div onClick> in a comment must be ignored.
import { useId, useState } from 'react';
import Image from 'next/image';

const identity = <T,>(x: T): T => x;

export function Accessible({ label, items, ...rest }: { label: string; items: string[] }) {
  const id = useId();
  const [value, setValue] = useState<string>('');
  return (
    <section aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{label}</h2>
      <img src="/logo.svg" alt="Acme" />
      <img src="/divider.svg" alt="" />
      <Image src="/hero.png" alt="People using the app" width={400} height={300} />
      <button type="button" onClick={() => setValue('')}>Clear</button>
      <button type="button" aria-label="Close"><XIcon aria-hidden="true" /></button>
      <button type="button">{label}</button>
      <label htmlFor={id}>Name</label>
      <input id={id} value={value} onChange={(e) => setValue(e.target.value)} />
      <label>Age <input type="number" /></label>
      <input type="hidden" name="csrf" />
      <input type="password" autoComplete="current-password" aria-label="Password" />
      <a href="/pricing">See pricing plans</a>
      <div role="button" tabIndex={0} onClick={() => {}} onKeyDown={() => {}}>Custom</div>
      <div role="dialog" aria-labelledby={`${id}-title`} aria-modal="true" />
      <div {...rest} onClick={() => {}} />
      <Button onClick={() => {}} />
      <ul>{items.map((i) => <li key={i}>{identity(i)}</li>)}</ul>
      <video src="/clip.mp4" controls><track kind="captions" src="/clip.vtt" srcLang="en" /></video>
      <iframe src="/map" title="Store location map" />
    </section>
  );
}

// Regression: comments inside a tag, stopPropagation-only handlers
export function Board({ cells }: { cells: string[] }) {
  return (
    <div role="group" aria-label="Board">
      {cells.map((c, i) => (
        <button
          key={i}
          type="button"
          // only aria-disabled, never `disabled`, so cells stay focusable
          aria-disabled={c !== ''}
          aria-label={`Cell ${i + 1}`}
        />
      ))}
      <div className="panel" onClick={(e) => e.stopPropagation()}>Panel</div>
    </div>
  );
}

export function Analytics({ id }: { id: string }) {
  return (
    <noscript>
      <iframe src={`https://www.googletagmanager.com/ns.html?id=${id}`} height="0" width="0" style={{ display: 'none', visibility: 'hidden' }} />
    </noscript>
  );
}
