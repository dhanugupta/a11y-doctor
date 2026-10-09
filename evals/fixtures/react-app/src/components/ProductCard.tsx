import Image from 'next/image';
import { useState } from 'react';

type Props = { name: string; onAdd: () => void; items: string[] };

export function ProductCard({ name, onAdd, items }: Props) {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <article className="card">
      {/* expect: img-alt */}
      <img src="/product.png" />
      {/* expect: img-alt */}
      <Image src="/hero.png" width={400} height={300} />
      {/* expect: click-without-keyboard */}
      <div className="card__toggle" onClick={() => setOpen(!open)}>Details</div>
      {/* expect: control-name */}
      <button onClick={onAdd}><CartIcon /></button>
      {/* expect: anchor-as-button */}
      <a onClick={onAdd}>Add to wishlist</a>
      {/* expect: generic-link-text */}
      <a href={`/products/${name}`}>Read more</a>
      {/* expect: positive-tabindex */}
      <span tabIndex={2}>{name}</span>
      <ul>
        {/* expect: click-without-keyboard */}
        {items.map((i) => <li key={i} onClick={() => setOpen(true)}>{i}</li>)}
      </ul>
    </article>
  );
}

export function WinOverlay({ onClose }: { onClose: () => void }) {
  return (
    // expect: backdrop-click
    <div className="fixed inset-0 bg-black/30" onClick={onClose}>
      <div role="dialog" aria-labelledby="win-title"><h2 id="win-title">You won!</h2></div>
    </div>
  );
}
