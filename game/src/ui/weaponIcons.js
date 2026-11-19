// Weapon silhouettes drawn as inline SVG paths (no image files), shared by the weapon card, the slot bar and the wheel.
export const GUN_SVG = {
  fists: '<path d="M22 8h22a6 6 0 0 1 6 6v4h4a5 5 0 0 1 0 10h-6l-4 6H24l-6-8V14a6 6 0 0 1 4-6z"/><path d="M24 14h24M24 20h24" stroke="#1a1030" stroke-width="2"/>',
  pistol: '<path d="M8 9h50l3 2v7H34l-2 3h-6l-3 15H11l4-17-7-2z"/><path d="M27 21h5l-1 6h-5" fill="none" stroke="#fff" stroke-width="2"/>',
  smg: '<path d="M2 12l12-2h48v4h6v5H46l-2 3H34l-2 14h-8l2-14h-6l-2 6h-6l1-6H2z"/><rect x="38" y="22" width="6" height="14" rx="1"/>',
  shotgun: '<path d="M0 15l18-3h54v5H40l-2 3H26l-6 9H8l6-9H0z"/><rect x="40" y="18" width="16" height="4" rx="2"/>',
  molotov: '<path d="M31 14h10v6c6 3 9 8 9 13v4H22v-4c0-5 3-10 9-13z"/><rect x="32" y="9" width="8" height="6" rx="1"/><path d="M36 9c-4-3-2-7 1-9 0 3 5 4 3 8z" fill="#ff8a1f"/><path d="M36 9c-2-2-1-4 1-5 0 2 2 3 1 5z" fill="#ffe14a"/>',
};
export const gunSvg = (id, cls = '') => `<svg class="${cls}" viewBox="0 0 74 40">${GUN_SVG[id] || ''}</svg>`;
