export const UNIT_PHOTOS = [
  '/photos/cabin-1.png',
  '/photos/cabin-2.png',
  '/photos/cabin-3.png',
] as const;

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

export function unitPhoto(index: number, row?: Record<string, unknown>): string {
  const fromApi = row
    ? ['imageUrl', 'image', 'photo', 'foto', 'thumbnail'].reduce<string>((acc, key) => {
        if (acc) {
          return acc;
        }
        const match = Object.keys(row).find((k) => k.toLowerCase() === key.toLowerCase());
        const value = match ? row[match] : null;
        return typeof value === 'string' && value.startsWith('http') ? value : '';
      }, '')
    : '';
  return fromApi || UNIT_PHOTOS[Math.abs(index) % UNIT_PHOTOS.length];
}
