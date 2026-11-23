export const UNIT_PHOTOS = [
  '/photos/cabin-1.png',
  '/photos/cabin-2.png',
  '/photos/cabin-3.png',
  '/photos/hero.png',
] as const;

/** Fotos de espacios/servicios (estética cabaña de montaña). ?v=4 evita cache urbano. */
export const AMENITY_PHOTOS: Record<string, { label: string; src: string }> = {
  chimenea: { label: 'Chimenea', src: '/photos/amenities/chimenea.jpg?v=4' },
  terraza: { label: 'Vista / terraza', src: '/photos/amenities/terraza.jpg?v=4' },
  cocina: { label: 'Cabaña / cocina', src: '/photos/amenities/cocina.jpg?v=4' },
  estacionamiento: { label: 'Acceso cordillera', src: '/photos/amenities/estacionamiento.jpg?v=4' },
  parrilla: { label: 'Exterior / fogón', src: '/photos/amenities/parrilla.jpg?v=4' },
  wifi: { label: 'Estar de cabaña', src: '/photos/amenities/wifi.jpg?v=4' },
  calefaccion: { label: 'Habitación / calor', src: '/photos/amenities/calefaccion.jpg?v=4' },
  calefacción: { label: 'Habitación / calor', src: '/photos/amenities/calefaccion.jpg?v=4' },
};

export type GalleryShot = { src: string; label: string };

export const SHOWCASE = [
  {
    id: 10,
    title: 'Cabaña Cordillera',
    subtitle: 'Cajón del Maipo · 4 huéspedes',
    meta: 'Chimenea · terraza · vista nieve',
    photo: '/photos/cabin-1.png',
    nightlyRate: 120000,
  },
  {
    id: 20,
    title: 'Refugio del bosque',
    subtitle: 'Valle andino · 2 huéspedes',
    meta: 'Cama king · cocina · wifi',
    photo: '/photos/cabin-2.png',
    nightlyRate: 95000,
  },
  {
    id: 30,
    title: 'Lodge Laguna',
    subtitle: 'Laguna de montaña · 6 huéspedes',
    meta: 'Living amplio · estacionamiento',
    photo: '/photos/cabin-3.png',
    nightlyRate: 150000,
  },
] as const;

function photoFromRow(row?: Record<string, unknown>): string {
  if (!row) {
    return '';
  }
  for (const key of ['imageUrl', 'image_url', 'image', 'photo', 'foto', 'thumbnail']) {
    const match = Object.keys(row).find((k) => k.toLowerCase() === key.toLowerCase());
    const value = match ? row[match] : null;
    if (typeof value === 'string' && value.trim()) {
      const trimmed = value.trim();
      if (trimmed.startsWith('http') || trimmed.startsWith('/')) {
        return trimmed;
      }
    }
  }
  return '';
}

export function unitPhoto(index: number, row?: Record<string, unknown>): string {
  return photoFromRow(row) || UNIT_PHOTOS[Math.abs(index) % UNIT_PHOTOS.length];
}

export function amenityShots(amenities: string[]): GalleryShot[] {
  const seen = new Set<string>();
  const shots: GalleryShot[] = [];
  for (const raw of amenities) {
    const key = raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
    const hit =
      AMENITY_PHOTOS[key] ||
      Object.entries(AMENITY_PHOTOS).find(([k]) => key.includes(k) || k.includes(key))?.[1];
    if (!hit || seen.has(hit.src)) {
      continue;
    }
    seen.add(hit.src);
    shots.push({ src: hit.src, label: hit.label });
  }
  return shots;
}

/**
 * Exterior/portada + fotos de los servicios que ofrece la unidad.
 * Así el cliente ve chimenea, terraza, cocina, etc. al explorar.
 */
export function unitGalleryShots(
  index: number,
  row: Record<string, unknown> | undefined,
  amenities: string[],
): GalleryShot[] {
  const primary = photoFromRow(row);
  const cover: GalleryShot = {
    src: primary || UNIT_PHOTOS[Math.abs(index) % UNIT_PHOTOS.length],
    label: 'Exterior',
  };
  const amenity = amenityShots(amenities);
  const rotated = UNIT_PHOTOS.map((_, i) => ({
    src: UNIT_PHOTOS[(Math.abs(index) + i) % UNIT_PHOTOS.length],
    label: 'Ambiente',
  }));

  const merged: GalleryShot[] = [cover];
  for (const shot of [...amenity, ...rotated]) {
    if (merged.some((m) => m.src === shot.src)) {
      continue;
    }
    merged.push(shot);
  }
  return merged.slice(0, 6);
}

/** @deprecated prefer unitGalleryShots */
export function unitGallery(index: number, row?: Record<string, unknown>): string[] {
  return unitGalleryShots(index, row, []).map((s) => s.src);
}
