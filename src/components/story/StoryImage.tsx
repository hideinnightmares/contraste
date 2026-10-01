import Image from 'next/image';
import { ViewTransition } from 'react';
import type { ArticleImage } from '@/domain/types';

interface Props {
  image: ArticleImage;
  articleId: string;
  /** Proporción del recorte, por ejemplo "3 / 2". */
  ratio: string;
  sizes: string;
  preload?: boolean;
  className?: string;
}

/**
 * Foto de una nota. Mantiene la proporción reservada (sin saltos de diseño), usa
 * el punto focal para recortar y comparte nombre de transición con la foto
 * principal de la nota: al abrirla, la imagen viaja de la tarjeta al encabezado.
 */
export function StoryImage({ image, articleId, ratio, sizes, preload = false, className }: Props) {
  return (
    <ViewTransition name={`foto-${articleId}`} share="photo-morph" default="none">
      <div className={`photo-frame ${className ?? ''}`} style={{ aspectRatio: ratio }}>
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          preload={preload}
          loading={preload ? 'eager' : 'lazy'}
          placeholder={image.blurDataURL ? 'blur' : 'empty'}
          blurDataURL={image.blurDataURL}
          style={{ objectPosition: image.focal ? `${image.focal.x}% ${image.focal.y}%` : 'center' }}
        />
      </div>
    </ViewTransition>
  );
}
