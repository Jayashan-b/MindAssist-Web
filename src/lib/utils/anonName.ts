/**
 * Deterministic two-word anonymous name generator.
 * Same seed always produces the same name — consistent across sessions.
 * Hacker/gamer aesthetic: adjective + creature/concept.
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
 * Generate a cool two-word name deterministically from a seed (e.g. appointmentId).
 * Example outputs: "Silent Fox", "Cyber Raven", "Neon Wraith"
 */
export function generateAnonName(seed: string): string {
  const h1 = hashStr(seed);
  const h2 = hashStr(seed + '\x01');
  const adj = ADJECTIVES[h1 % ADJECTIVES.length];
  const noun = NOUNS[h2 % NOUNS.length];
  return `${adj} ${noun}`;
}
