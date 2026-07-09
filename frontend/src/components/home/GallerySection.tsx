'use client';

import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { GALLERY_IMAGES } from './data';

export function GallerySection() {
  const [galleryIdx, setGalleryIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setGalleryIdx((prev) => (prev + 1) % GALLERY_IMAGES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-12 md:py-20 px-4 bg-white/2">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-2">
          Diseños <span className="text-amber-400">reales</span>
        </h2>
        <p className="text-center text-white/40 text-sm mb-8">
          Lámparas que ya están en hogares de México
        </p>
        <div
          className="relative overflow-hidden rounded-3xl"
          style={{ aspectRatio: '4/3' }}
        >
          {/* TEMP: images removed for perf diagnostic — restore before merging */}
          {GALLERY_IMAGES.map((src, i) => (
            <div
              key={src}
              className={clsx(
                'absolute inset-0 transition-opacity duration-700 bg-white/5',
                i === galleryIdx ? 'opacity-100 z-10' : 'opacity-0 z-0',
              )}
            />
          ))}
          <button
            onClick={() =>
              setGalleryIdx(
                (prev) =>
                  (prev - 1 + GALLERY_IMAGES.length) % GALLERY_IMAGES.length,
              )
            }
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white text-xl transition-colors"
            aria-label="Anterior"
          >
            &#8249;
          </button>
          <button
            onClick={() =>
              setGalleryIdx((prev) => (prev + 1) % GALLERY_IMAGES.length)
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white text-xl transition-colors"
            aria-label="Siguiente"
          >
            &#8250;
          </button>
          <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2">
            {GALLERY_IMAGES.map((_, i) => (
              <button
                key={i}
                onClick={() => setGalleryIdx(i)}
                className={clsx(
                  'w-2.5 h-2.5 rounded-full transition-colors',
                  i === galleryIdx
                    ? 'bg-amber-400'
                    : 'bg-white/30 hover:bg-white/60',
                )}
                aria-label={`Imagen ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
