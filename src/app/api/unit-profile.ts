/** Perfil opcional de unidad (CAT-01 / ms-catalog). Todo puede venir null. */
export interface UnitProfileFields {
  description?: string | null;
  location?: string | null;
  maxGuests?: number | null;
  imageUrl?: string | null;
  amenities?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
}

export type CatalogUnitBody = {
  code: string;
  name: string;
  rate: number;
  available: boolean;
} & UnitProfileFields;

export type PreparationStatus = 'NONE' | 'PENDING' | 'IN_PROGRESS' | 'READY';

export function fieldOf(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const match = Object.keys(row).find((k) => k.toLowerCase() === key.toLowerCase());
    if (match && row[match] != null && typeof row[match] !== 'object') {
      return String(row[match]);
    }
  }
  return '';
}

export function numberFieldOf(row: Record<string, unknown>, keys: string[]): number | null {
  const raw = fieldOf(row, keys);
  if (!raw) {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function amenitiesList(row: Record<string, unknown>): string[] {
  const raw = fieldOf(row, ['amenities', 'comodidades']);
  if (!raw) {
    return [];
  }
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function preparationOf(row: Record<string, unknown>): PreparationStatus {
  const raw = fieldOf(row, ['preparationStatus', 'preparation_status']).toUpperCase();
  if (raw === 'PENDING' || raw === 'IN_PROGRESS' || raw === 'READY' || raw === 'NONE') {
    return raw;
  }
  return 'NONE';
}

/** Body de PUT: siempre reenviar la ficha (si se omite, el API la deja en null). */
export function catalogUnitPayload(input: {
  code: string;
  name: string;
  rate: number;
  available: boolean;
  description: string;
  location: string;
  maxGuests: number | null;
  imageUrl: string;
  amenities: string;
  bedrooms: number | null;
  bathrooms: number | null;
}): CatalogUnitBody {
  return {
    code: input.code.trim(),
    name: input.name.trim(),
    rate: input.rate,
    available: input.available,
    description: blankToNull(input.description),
    location: blankToNull(input.location),
    maxGuests: positiveOrNull(input.maxGuests),
    imageUrl: blankToNull(input.imageUrl),
    amenities: blankToNull(input.amenities),
    bedrooms: positiveOrNull(input.bedrooms),
    bathrooms: positiveOrNull(input.bathrooms),
  };
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function positiveOrNull(value: number | null): number | null {
  if (value == null || !Number.isFinite(value) || value < 1) {
    return null;
  }
  return Math.trunc(value);
}
