"use client";

import { useRef } from "react";

export default function PremiumProductCarousel({ images, title }: { images: string[]; title: string }) {
  const track = useRef<HTMLDivElement>(null);
  function move(direction: number) {
    const node = track.current;
    if (!node) return;
    node.scrollBy({ left: direction * node.clientWidth, behavior: "smooth" });
  }
  return (
    <div className="premium-product-gallery">
      <div className="premium-product-track" ref={track} aria-label={`${title} photographs`}>
        {images.map((src, index) => <img key={src} src={src} alt={`${title}, photo ${index + 1}`} loading="lazy" />)}
      </div>
      {images.length > 1 && <div className="premium-gallery-controls">
        <button type="button" onClick={() => move(-1)} aria-label="Previous photo">‹</button>
        <span>{images.length} photos</span>
        <button type="button" onClick={() => move(1)} aria-label="Next photo">›</button>
      </div>}
    </div>
  );
}
