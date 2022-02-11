import { hero } from 'overwatch-stats-api/typings/autogen'

export const heroes: Record<hero, string> = {
  ana: 'Ana',
  ashe: 'Ashe',
  baptiste: 'Baptiste',
  bastion: 'Bastion',
  brigitte: 'Brigitte',
  doomfist: 'Doomfist',
  dva: 'D.Va',
  echo: 'Echo',
  genji: 'Genji',
  hammond: 'Wrecking Ball',
  hanzo: 'Hanzo',
  junkrat: 'Junkrat',
  lucio: 'Lúcio',
  mccree: 'McCree',
  mei: 'Mei',
  mercy: 'Mercy',
  moira: 'Moira',
  orisa: 'Orisa',
  pharah: 'Pharah',
  reaper: 'Reaper',
  reinhardt: 'Reinhardt',
  roadhog: 'Roadhog',
  sigma: 'Sigma',
  soldier: 'Soldier: 76',
  sombra: 'Sombra',
  symmetra: 'Symmetra',
  torbjorn: 'Torbjörn',
  tracer: 'Tracer',
  widowmaker: 'Widowmaker',
  winston: 'Winston',
  zarya: 'Zarya',
  zenyatta: 'Zenyatta'
}
export type supportedHero = hero

/** Converts hero keys into readable names
 * @param str The hero key to convert
 */
export function heroName(str: string): string {
  return heroes[str]
}

/** Returns whether the supplied string is a SupportedHero */
export function isSupported(hero: string): hero is supportedHero {
  return Object.keys(heroes).includes(hero)
}
