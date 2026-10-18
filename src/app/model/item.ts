export const ITEMS = [
  // Signs of game
  'spotting', // pozorování
  'tracks', // stopy
  'droppings', // trus
  'rub-scrape', // vytloukání / hrabání
  'wallow', // kaliště
  'rut-call', // troubení
  // Harvest & follow-up
  'harvest', // úlovek
  'wounded-game', // nástřel / dohledávka
  'found-dead', // uhynulá / sražená zvěř
  // Habitat & management
  'game-damage', // škody zvěří
  // Infrastructure
  'hunting-stand', // posed / kazatelna
  'trail-camera', // fotopast
  // Other
  'poaching', // pytláctví
] as const;
export type Item = (typeof ITEMS)[number];

/** Items about a place or a facility rather than an animal, so they are recorded without one */
const ITEMS_WITHOUT_ANIMAL: readonly Item[] = ['hunting-stand', 'trail-camera'];

export function itemHasAnimal(item: Item): boolean {
  return !ITEMS_WITHOUT_ANIMAL.includes(item);
}

/** Only a sighting can be of a herd or an individual */
export function itemHasHerd(item: Item): boolean {
  return item === 'spotting';
}

/** Srstnatá zvěř – Vyhláška č. 245/2002 Sb., § 1 */
export const GAME_MAMMALS = [
  'fallow-deer', // daněk skvrnitý
  'red-deer', // jelen evropský
  'white-tailed-deer', // jelenec běloocasý
  'badger', // jezevec lesní
  'chamois', // kamzík horský
  'wild-goat', // koza bezoárová
  'wild-rabbit', // králík divoký
  'pine-marten', // kuna lesní
  'stone-marten', // kuna skalní
  'red-fox', // liška obecná
  'mouflon', // muflon
  'wild-boar', // prase divoké
  'dybowski-sika-deer', // sika Dybowského
  'japanese-sika-deer', // sika japonský
  'roe-deer', // srnec obecný
  'brown-hare', // zajíc polní
] as const;
export type GameMammal = (typeof GAME_MAMMALS)[number];

/** Pernatá zvěř – Vyhláška č. 245/2002 Sb., § 1 */
export const GAME_BIRDS = [
  'reeves-pheasant', // bažant královský
  'common-pheasant', // bažant obecný
  'collared-dove', // hrdlička zahradní
  'wood-pigeon', // holub hřivnáč
  'white-fronted-goose', // husa běločelá
  'bean-goose', // husa polní
  'greylag-goose', // husa velká
  'mallard', // kachna divoká
  'wild-turkey', // krocan divoký
  'helmeted-guineafowl', // perlička obecná
  'magpie', // straka obecná
  'carrion-crow', // vrána obecná
  'red-legged-partridge', // orebice rudá
] as const;
export type GameBird = (typeof GAME_BIRDS)[number];

/** Druhy vyžadující regulaci (not game) – Vyhláška č. 454/2021 Sb., § 1 */
export const REGULATED_SPECIES = [
  'egyptian-goose', // husice nilská
  'raccoon', // mýval severní
  'american-mink', // norek americký
  'coypu', // nutrie říční
  'raccoon-dog', // psík mývalovitý
  'muskrat', // ondatra pižmová
] as const;
export type RegulatedSpecies = (typeof REGULATED_SPECIES)[number];

/**
 * Animals that may legally be hunted in the Czech Republic.
 *
 * Game species with a hunting season according to Vyhláška č. 245/2002 Sb., § 1
 * (version effective from 1. 4. 2025), plus non-game species requiring regulation
 * according to Vyhláška č. 454/2021 Sb.
 */
export type Animal = GameMammal | GameBird | RegulatedSpecies;

export const ANIMAL_GROUPS = {
  'game-mammals': GAME_MAMMALS,
  'game-birds': GAME_BIRDS,
  'regulated-species': REGULATED_SPECIES,
} as const satisfies Record<string, readonly Animal[]>;
export type AnimalGroup = keyof typeof ANIMAL_GROUPS;

/** Hoofed game (spárkatá zvěř), which is marked with a numbered tag (plomba) once harvested */
const HOOFED_GAME: readonly GameMammal[] = [
  'fallow-deer',
  'red-deer',
  'white-tailed-deer',
  'chamois',
  'wild-goat',
  'mouflon',
  'wild-boar',
  'dybowski-sika-deer',
  'japanese-sika-deer',
  'roe-deer',
];

/** A harvested animal of hoofed game is marked with a tag, whose number can be recorded */
export function hasTagNumber(item: Item, animal: Animal | null): boolean {
  return item === 'harvest' && animal !== null && HOOFED_GAME.includes(animal as GameMammal);
}
