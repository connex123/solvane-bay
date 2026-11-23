// Who's who in SOLVANE BAY: LOW TIDE. Each entry gives a name and role plus the look the portrait painter uses:
// skin, hair colour and style, shirt colour, a two-stop background gradient and whether they wear shades.

function person(name, role, look) {
  const [skin, hair, style, shirt, bgTop, bgBottom, shades] = look;
  return { name, role, skin, hair, style, shirt, bg: [bgTop, bgBottom], shades };
}

export const CAST = {
  nico: person('Nico Varela', 'Home after five years, ex-courier',
    ['#c68a5e', '#15110e', 'short', '#1fa7a0', '#1fa7a0', '#0e3b4a', false]),
  sol: person('Sol Ortega', 'Getaway driver, old partner',
    ['#a8704a', '#2a1208', 'bun', '#ff8a3d', '#ff8a3d', '#8a2e4e', true]),
  dex: person('Dex Calloway', 'Fixer, owns Club Velvet',
    ['#e6b890', '#c9b07a', 'slick', '#7a5cff', '#b06ad8', '#2a1250', true]),
  wren: person('Old Wren', 'Mechanic, Point Wren garage',
    ['#d9a577', '#cfcfcf', 'bald', '#6a7a8a', '#e9c46a', '#5a4a2a', false]),
  tamsin: person('Tamsin Okoro', 'Hacker, runs TIDE FM 88.1',
    ['#7a5236', '#101010', 'long', '#4fd8ff', '#4fd8ff', '#16305a', false]),
  brandt: person('Viktor Brandt', 'Crown Syndicate boss',
    ['#e0b08c', '#dddddd', 'slick', '#15151a', '#d9503f', '#2a0a12', true]),
  reyne: person('Capt. Hollis Reyne', 'SBPD captain, on the Crown payroll',
    ['#d29a70', '#3a2a1a', 'cap', '#1d2b53', '#f2c230', '#1d2b53', true]),
  dispatch: person('SBPD Dispatch', 'Police radio',
    ['#d8a47c', '#1d2b53', 'cap', '#1d2b53', '#2060ff', '#0a0f2a', false]),
};

export const GANGS = {
  coral: 'Coral Kings',
  brandt: 'Crown Syndicate',
};
