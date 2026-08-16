/** The fame ladder. Tiers can be lost; nothing here is sticky except placements. */

// One flat colour chip per tier, pitched for the Photocopy/Y2K palette —
// saturated enough to sit next to the signal red without muddying it.
export const STATUS = [
  null,
  { level: 1, name: 'BEDROOM PRODUCER', color: '#6B6B6B', note: 'Nobody has heard it.' },
  { level: 2, name: 'LOCAL PRODUCER', color: '#2C6E49', note: 'People in your city know the name.' },
  { level: 3, name: 'KNOWN PRODUCER', color: '#1E5F8C', note: "Producers know you. The public doesn't." },
  { level: 4, name: 'NATIONAL PRODUCER', color: '#4B2E9E', note: 'You are on records people own.' },
  { level: 5, name: 'INTERNATIONAL PRODUCER', color: '#A81C6E', note: 'The work travels without you.' },
  { level: 6, name: 'LEGENDARY PRODUCER', color: '#111111', note: 'They will use the word "era".' },
];

export const REQUIREMENT_TEXT = {
  2: 'Relevance 10',
  3: 'Relevance 25 + Skill 40',
  4: 'Relevance 45 + a Tier-3 placement',
  5: 'Relevance 65 + a Tier-4 placement + Taste 50',
  6: 'Relevance 85 + Taste 75 + (3 awards, a Tier-5 placement, or a defining album)',
};

export function majorAwardCount(a) {
  return a.grammyWins + a.oscarWins + a.emmyWins;
}

export function computeStatus(s) {
  const maxT = s.maxPlacementTier;
  const legendaryProof = majorAwardCount(s.awards) >= 3 || maxT >= 5 || s.flags.has('defining_album');
  if (s.relevance >= 85 && s.taste >= 75 && legendaryProof) return 6;
  if (s.relevance >= 65 && maxT >= 4 && s.taste >= 50) return 5;
  if (s.relevance >= 45 && maxT >= 3) return 4;
  if (s.relevance >= 25 && s.skill >= 40) return 3;
  if (s.relevance >= 10) return 2;
  return 1;
}

/** The parallel route: Legendary by Taste, never famous. */
export function isArchitect(s) {
  return s.taste >= 80 && s.undergroundCount >= 3 && s.skill >= 60;
}
