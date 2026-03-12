/**
 * Deterministic anonymous name generator.
 * Format: "Adjective Noun #NNNN" — e.g. "Cyber Raven #4821"
 *
 * Combinations: 30 adjectives × 30 nouns × 10,000 numbers = 9,000,000 unique IDs.
 * The same seed (appointmentId) always produces the same name.
 */

const ADJECTIVES = [
  'Silent', 'Swift', 'Phantom', 'Shadow', 'Crimson',
  'Azure', 'Void', 'Frost', 'Iron', 'Jade',
  'Neon', 'Dark', 'Hidden', 'Onyx', 'Sage',
  'Turbo', 'Apex', 'Storm', 'Cyber', 'Stealth',
  'Rogue', 'Pixel', 'Binary', 'Velvet', 'Quantum',
  'Solar', 'Lunar', 'Astral', 'Cobalt', 'Ember',
];

const NOUNS = [
  'Fox', 'Wolf', 'Hawk', 'Raven', 'Lynx',
  'Viper', 'Cipher', 'Pulse', 'Nova', 'Echo',
  'Blaze', 'Arrow', 'Wraith', 'Nexus', 'Byte',
  'Prism', 'Veil', 'Flare', 'Vortex', 'Drift',
  'Comet', 'Shade', 'Shard', 'Flux', 'Crypt',
  'Drone', 'Blade', 'Orbit', 'Signal', 'Surge',
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

/**
 * Returns a deterministic "Adjective Noun #NNNN" name from a seed string.
 * Example: generateAnonName("abc123") → "Cyber Raven #4821"
 */
export function generateAnonName(seed: string): string {
  const h1 = hashStr(seed);
  const h2 = hashStr(seed + '\x01');
  const h3 = hashStr(seed + '\x02');
  const adj = ADJECTIVES[h1 % ADJECTIVES.length];
  const noun = NOUNS[h2 % NOUNS.length];
  const num = String(h3 % 10000).padStart(4, '0');
  return `${adj}-${noun} #${num}`;
}
