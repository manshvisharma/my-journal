/**
 * Normalisation for multilingual and Roman-Hindi (Hinglish) search
 */
export function normaliseTerm(term: string): string {
  if (!term) return '';

  // 1. Lowercase and normalize unicode decomposition
  let normalized = term.toLowerCase().normalize('NFD');

  // 2. Strip diacritics (accents)
  normalized = normalized.replace(/[\u0300-\u036f]/g, '');

  // 3. Roman-Hindi (Hinglish) phonetic normalization:
  // Collapse doubled vowels: aa -> a, ee -> i, oo -> u, ii -> i, uu -> u
  normalized = normalized
    .replace(/aa+/g, 'a')
    .replace(/ee+/g, 'i')
    .replace(/oo+/g, 'u')
    .replace(/ii+/g, 'i')
    .replace(/uu+/g, 'u');

  // Normalize w and v where safe
  normalized = normalized.replace(/w/g, 'v');

  // Normalize common phonetic variations (e.g. ph -> f, kh/gh retained)
  normalized = normalized.replace(/ph/g, 'f');

  return normalized.trim();
}

/**
 * Unicode-aware tokenizer that preserves words in English, Devanagari (Hindi),
 * Roman script, emojis, and digits.
 */
export function unicodeTokenizer(text: string): string[] {
  if (!text) return [];

  // Match sequences of alphanumeric unicode characters (including Devanagari \p{sc=Devanagari}),
  // and individual emojis
  const tokens: string[] = [];
  const regex = /[\p{L}\p{N}]+|\p{Extended_Pictographic}/gu;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const raw = match[0];
    const norm = normaliseTerm(raw);
    if (norm) {
      tokens.push(norm);
    }
  }

  return tokens;
}
