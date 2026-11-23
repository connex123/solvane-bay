// Weapon silhouettes as inline SVG (no image files), drawn on a 74 x 40 grid with the muzzle to the right.
// The HUD weapon card, the slot bar and the weapon wheel all share them; CSS sets the fill colour.
const DETAIL = '#1a1030';

const ICONS = {
  // a clenched fist seen from the knuckle side, thumb tucked underneath
  fists: [
    '<rect x="20" y="9" width="32" height="20" rx="7"/>',
    '<path d="M24 26h22l-3 7H28z"/>',
    '<path d="M50 15h5a5 5 0 0 1 0 10h-6z"/>',
    `<path d="M28 10v10M36 10v10M44 10v10" stroke="${DETAIL}" stroke-width="2"/>`,
  ],
  // slide, frame, angled grip and trigger guard
  pistol: [
    '<path d="M9 9h49l4 3v6H9z"/>',
    '<path d="M12 18h20l-2 4h-5l-4 14H10l4-15z"/>',
    '<path d="M25 20h8v3l-3 4h-6" fill="none" stroke="#fff" stroke-width="2"/>',
  ],
  // receiver with a short barrel, straight magazine, pistol grip and folded wire stock
  smg: [
    '<path d="M16 11h44v4h7v4H60v3H16z"/>',
    '<rect x="38" y="21" width="6" height="15" rx="1"/>',
    '<path d="M22 21h9l-3 13h-7z"/>',
    '<path d="M3 11h13v3H7v6h9v3H3z"/>',
  ],
  // long barrel over the tube magazine, pump grip, receiver and a full stock
  shotgun: [
    '<path d="M24 12h48v4H24z"/>',
    '<rect x="42" y="16" width="16" height="5" rx="2"/>',
    '<path d="M20 12h10v9h-6l-5 8H8l6-9H1v-5l19-4z"/>',
  ],
  // a corked bottle with a lit rag
  molotov: [
    '<path d="M32 15h9v5c6 3 9 7 9 12v5H23v-5c0-5 3-9 9-12z"/>',
    '<rect x="33" y="10" width="7" height="6" rx="1"/>',
    '<path d="M37 10c-5-3-3-7 0-10 1 3 5 4 3 9z" fill="#ff8a1f"/>',
    '<path d="M37 10c-2-2-1-4 1-6 0 2 2 3 1 6z" fill="#ffe14a"/>',
  ],
};

export const GUN_SVG = Object.fromEntries(Object.entries(ICONS).map(([id, parts]) => [id, parts.join('')]));

export function gunSvg(id, cls = '') {
  const body = GUN_SVG[id] || '';
  return `<svg class="${cls}" viewBox="0 0 74 40">${body}</svg>`;
}
