import table from 'markdown-table'
import * as fs from 'fs'
import * as path from 'path'

import { heroes, heroName } from '../utils/ow_hero_names'

const contents = [
  ['Hero', 'Aliases']
]

for (const hero in heroes) {
  const names = [hero, ...heroes[hero]]
  const nameStr = '`' + names.join('`, `') + '`'
  contents.push([heroName(hero).replace('.', '<span></span>.'), nameStr])
}

const tableStr = table(contents)

const overall = '# Overwatch heroes cheatsheet\n' + tableStr

fs.writeFileSync(path.join(__dirname, '../../doc/ow/OW_HEROES.md'), overall)