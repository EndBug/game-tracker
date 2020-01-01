import table from 'markdown-table'
import * as fs from 'fs'
import * as path from 'path'

// #region Overwatch
import { heroes, heroName } from '../utils/ow_hero_names'

for (const hero in heroes)
  heroes[hero].unshift(hero)

writeTable({
  getReadable: heroName,
  relPath: 'ow/OW_HEROES.md',
  title: 'Overwatch heroes cheatsheet',
  type: 'Hero',
  values: heroes
})
// #endregion

// #region Rainbow 6 Siege
import R6API from 'r6api.js'
const { constants } = new R6API('', '')

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const wpValues: Record<string, string[]> = {}
for (const weapon of constants.WEAPONS) {
  const { name } = weapon
  wpValues[name] = [name.toLowerCase().split(' ').join('-')]
}

const wtValues: Record<string, string[]> = {}
for (const key in constants.WEAPONTYPES) {
  const name = constants.WEAPONTYPES[key]
  // @ts-ignore
  wtValues[capitalize(name)] = [name]
}

const opValues: Record<string, string[]> = {}
for (const operator of constants.OPERATORS) {
  const { name } = operator
  opValues[name] = [name.toLowerCase().split(' ').join()]
}

const tables = [
  getNameTable({
    type: 'Operator',
    subtitle: 'Operators',
    values: opValues,
    getReadable: (name) => constants.OPERATORS.find(op => op.name.toLowerCase().split(' ').join() == name.toLowerCase().split(' ').join()).readableName
  }),
  getNameTable({
    type: 'Category',
    subtitle: 'Weapon categories',
    values: wtValues
  }),
  getNameTable({
    type: 'Weapon',
    subtitle: 'Weapon names',
    values: wpValues
  })
]
const last = '# Rainbow 6 Siege cheatsheet\n' + tables.join('\n')
writeToFile('r6/R6_NAMES.md', last)


// #endregion

// #region Utils
/** Creates an alias table */
function getNameTable(opt: TableOptions) {
  const contents = [
    [opt.type, 'Aliases']
  ]

  if (!opt.getReadable) opt.getReadable = (s) => s

  for (const name in opt.values) {
    const names = [...opt.values[name]],
      nameStr = '`' + names.join('`, `') + '`'
    contents.push([opt.getReadable(name).replace('.', '<span></span>.'), nameStr])
  }

  const tableStr = table(contents)
  return (opt.title ? `# ${opt.title}\n` : '') + (opt.subtitle ? `### ${opt.subtitle}\n` : '') + tableStr
}
interface TableOptions {
  getReadable?: (name: string) => string
  title?: string
  type: string
  subtitle?: string
  values: Record<string, string[]>
}

/** Writes data to a doc file
 * @param relPath The path relative to the doc directory
 * @param data The data to write to the file, as plain text
 */
function writeToFile(relPath: string, data: string) {
  return fs.writeFileSync(path.join(__dirname, '../../doc/', relPath), data)
}

/** Creates a table and writes it to a doc file */
function writeTable(opt: WriteTableOptions) {
  return writeToFile(opt.relPath, getNameTable(opt))
}
interface WriteTableOptions extends TableOptions {
  /** The path relative to the doc directory */
  relPath: string
}
// #endregion
