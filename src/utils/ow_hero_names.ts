function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const heroes = {
  'ana': [],
  'ashe': ['Ashe', 'BOB', 'B.O.B.'],
  'baptiste': ['Jean-Baptiste'],
  'bastion': [],
  'brigitte': ['brig'],
  'doomfist': ['doom'],
  'dva': ['D.Va'],
  'genji': ['gengu'],
  'hanzo': ['handsoap'],
  'junkrat': ['junk', 'Chacal', 'Hunkrat'],
  'lucio': ['Lúcio'],
  'mccree': ['mc'],
  'mei': ['satan'],
  'mercy': ['ange', 'angela'],
  'moira': [],
  'orisa': ['Oriisa'],
  'pharah': ['phara', 'fara'],
  'reaper': ['faucheur'],
  'reinhardt': ['rein'],
  'roadhog': ['road', 'Chopper'],
  'soldier76': ['76', 'soldier_76', 'soldier', 'soldier-76'],
  'sombra': [],
  'symmetra': ['symm'],
  'torbjorn': ['torb'],
  'tracer': [],
  'widowmaker': ['widow', 'Fatale'],
  'winston': ['monkey', 'harambe', 'scientist'],
  'wrecking_ball': ['hammond', 'wreckingball', 'wrecking ball'],
  'zarya': [],
  'zenyatta': ['zen', 'Zeniyatta']
};

/**
 * Coverts hero keys into readable names
 * @param str The hero key to convert
 */
export function heroName(str: string): string {
  const custom = {
    'dva': 'D.Va',
    'lucio': 'Lúcio',
    'mccree': 'McCree',
    'soldier76': 'Soldier 76',
  };
  if (custom[str]) return custom[str];
  const arr = str.split('_');
  for (let i = 0; i < arr.length; i++) arr[i] = capitalize(arr[i]);
  return arr.join(' ');
}
