export type ShapeCategory =
  | 'animal'
  | 'object'
  | 'symbol'
  | 'letter_number'
  | 'abstract';

export const SHAPE_CATEGORIES = [
  { id: 'animal' as const, labelKey: 'shapeAnimal' as const },
  { id: 'object' as const, labelKey: 'shapeObject' as const },
  { id: 'symbol' as const, labelKey: 'shapeSymbol' as const },
  { id: 'letter_number' as const, labelKey: 'shapeLetterNumber' as const },
  { id: 'abstract' as const, labelKey: 'shapeAbstract' as const },
] as const;

export function inferShapeCategory(name: string): ShapeCategory {
  const lower = name.toLowerCase();

  // Animals
  if (
    lower.includes('gajah') ||
    lower.includes('buaya') ||
    lower.includes('banteng') ||
    lower.includes('kucing') ||
    lower.includes('cat') ||
    lower.includes('dog') ||
    lower.includes('anjing') ||
    lower.includes('bird') ||
    lower.includes('burung') ||
    lower.includes('ikan') ||
    lower.includes('fish') ||
    lower.includes('kura') ||
    lower.includes('horse') ||
    lower.includes('kuda') ||
    lower.includes('butterfly') ||
    lower.includes('kupu') ||
    lower.includes('dino') ||
    lower.includes('tiger') ||
    lower.includes('harimau') ||
    lower.includes('singa') ||
    lower.includes('lion') ||
    lower.includes('rabbit') ||
    lower.includes('kelinci') ||
    lower.includes('garong')
  ) {
    return 'animal';
  }

  // Symbols
  if (
    lower.includes('star') ||
    lower.includes('bintang') ||
    lower.includes('heart') ||
    lower.includes('hati') ||
    lower.includes('love') ||
    lower.includes('circle') ||
    lower.includes('lingkaran') ||
    lower.includes('triangle') ||
    lower.includes('segitiga') ||
    lower.includes('cross') ||
    lower.includes('silang') ||
    lower.includes('diamond') ||
    lower.includes('infinity')
  ) {
    return 'symbol';
  }

  // Objects & Landmarks
  if (
    lower.includes('monas') ||
    lower.includes('candi') ||
    lower.includes('tower') ||
    lower.includes('car') ||
    lower.includes('mobil') ||
    lower.includes('bike') ||
    lower.includes('sepeda') ||
    lower.includes('house') ||
    lower.includes('rumah') ||
    lower.includes('tree') ||
    lower.includes('pohon') ||
    lower.includes('flower') ||
    lower.includes('bunga') ||
    lower.includes('crown') ||
    lower.includes('mahkota') ||
    lower.includes('cangkir') ||
    lower.includes('cup') ||
    lower.includes('guitar') ||
    lower.includes('gitar')
  ) {
    return 'object';
  }

  // Letters and Numbers
  if (
    /\b[0-9]\b/.test(lower) ||
    /angka|nomor|number|huruf|letter/i.test(lower)
  ) {
    return 'letter_number';
  }

  return 'abstract';
}
