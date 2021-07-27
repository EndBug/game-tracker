import table from 'markdown-table'
import * as fs from 'fs'
import * as path from 'path'

const docs = {
  githubURL: 'https://game-tracker.js.org/#',
  internalURL: ''
}

// #region README
function udpateREADME() {
  const READMEPath = path.join(__dirname, '../../README.md')
  const current = fs.readFileSync(READMEPath, { encoding: 'utf8' })
  const processed = current.split(docs.githubURL).join(docs.internalURL)
  writeToFile('README.md', processed)
}
udpateREADME()
// #endregion

// #region Overwatch
import { heroes, heroName } from '../utils/ow_hero_names'

for (const hero in heroes) heroes[hero].unshift(hero)

writeTable({
  getReadable: heroName,
  relPath: 'ow/ow_heroes.md',
  title: 'Overwatch heroes cheatsheet',
  type: 'Hero',
  values: heroes
})
// #endregion

// #region Rainbow 6 Siege
import { constants } from 'r6api.js'

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const wpValues: Record<string, string[]> = {}
for (const weapon of Object.values(constants.WEAPONS)) {
  const { name } = weapon
  wpValues[name] = [name.toLowerCase().split(' ').join('-')]
}

const wtValues: Record<string, string[]> = {}
for (const key in constants.WEAPONTYPES) {
  const name =
    constants.WEAPONTYPES[key as keyof typeof constants.WEAPONTYPES].id
  wtValues[capitalize(name)] = [name]
}

const opValues: Record<string, string[]> = {}
for (const id in constants.OPERATORS) {
  opValues[id] = [id.toLowerCase().split(' ').join('')]
}

const tables = [
  getNameTable({
    type: 'Operator',
    subtitle: 'Operators',
    values: opValues,
    getReadable: (id) => constants.OPERATORS[id].name,
    sort: false
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
const last = '# Rainbow Six Siege cheatsheet\n' + tables.join('\n\n')
writeToFile('r6/r6_names.md', last)

// #endregion

// #region Utils
/** Creates an alias table */
function getNameTable(opt: TableOptions) {
  const contents = []

  if (!opt.getReadable) opt.getReadable = (s) => s

  for (const name in opt.values) {
    const names = [...opt.values[name]],
      nameStr = '`' + names.join('`, `') + '`'
    contents.push([
      opt.getReadable(name).replace('.', '<span></span>.'),
      nameStr
    ])
  }

  const tableStr = table([
    [opt.type, 'Aliases'],
    ...(opt.sort === false ? contents : contents.sort())
  ])
  return (
    (opt.title ? `# ${opt.title}\n` : '') +
    (opt.subtitle ? `### ${opt.subtitle}\n` : '') +
    tableStr
  )
}
interface TableOptions {
  getReadable?: (name: string) => string
  title?: string
  type: string
  subtitle?: string
  sort?: boolean
  values: Record<string, string[]>
}

/** Writes data to a doc file
 * @param relPath The path relative to the doc directory
 * @param data The data to write to the file, as plain text
 */
function writeToFile(relPath: string, data: string) {
  return fs.writeFileSync(path.join(__dirname, '../../docs/', relPath), data)
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
