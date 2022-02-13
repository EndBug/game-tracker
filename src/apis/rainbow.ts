import R6API, { constants } from 'r6api.js'
import { IGetStats as Stats } from 'r6api.js/dist/methods/getStats'
import { IGetRanks } from 'r6api.js/dist/methods/getRanks'
import {
  OperatorName as OperatorId,
  OperatorName,
  Platform,
  SeasonId,
  WeaponName,
  WeaponTypeId
} from 'r6api.js/dist/typings'
type WeaponCategory = Stats['pvp']['weapons']['assault']
type WeaponTypeName =
  typeof constants.WEAPONTYPES[keyof typeof constants.WEAPONTYPES]['name']
type PvPMode = Stats['pvp']['modes'][keyof Stats['pvp']['modes']]
type PvEMode = Stats['pve']['modes'][keyof Stats['pve']['modes']]
type RankSeason = IGetRanks['seasons'][SeasonId]
type OperatorStats = Stats['pvp' | 'pve']['operators'][OperatorName]
type PvpQueue = Stats['pvp']['queues']['ranked']

import {
  getShortName,
  ensureOne,
  mergeAndSum,
  readHours,
  readNumber,
  camelToReadable,
  capitalize,
  Cache,
  WithOptional
} from '../utils/utils'
import {
  CommandInteraction,
  MessageEmbed,
  User,
  UserResolvable
} from 'discord.js'
import { API } from '../utils/api'
import { client } from '../core/app'

const { UbisoftEmail, UbisoftPassword } = process.env
const r6api = new R6API({
  email: UbisoftEmail,
  password: UbisoftPassword
})

var cache = new Cache('Rainbow 6 Siege')

export type playerEntry = WithOptional<
  Awaited<ReturnType<typeof RainbowAPI['prototype']['checkDatabase']>>,
  'id' | 'created_at'
>
export type platform = playerEntry['platform']

// #region Embeds
/** Ok, I know this is stupid, but it's kind of necessary */
type embedType_Type =
  | 'error'
  | 'general'
  | 'modes'
  | 'wp-single'
  | 'wp-cat'
  | 'op'
  | 'types'
  | 'queue'
  | 'link'
  | 'unlink'

/** Custom embed class that acts as base for other embeds */
class CustomEmbed extends MessageEmbed {
  type: embedType_Type

  constructor(int: CommandInteraction, ...args) {
    super(...args)
    return this.setTimestamp()
      .setAuthor({
        name: 'Rainbow 6 Siege Stats',
        iconURL: 'https://i.imgur.com/RgoDkpy.png'
      })
      .setColor('WHITE')
      .via(int.user)
  }

  /** Adds the image of the most played operator to the embed
   * @param rawStats The raw stats object
   * @param type The playType to search the operator in
   */
  addOpImage(rawStats: Stats, type: playType) {
    const mostUsedOp = getMostPlayedOperator(rawStats, type)
    return this.setThumbnail(mostUsedOp.icon)
  }

  /** Adds a title to the embed with the following format:
   *
   * _`str` stats for `username` - `PLATFORM`_ */
  setHeader(str: string, username: string, platform: Platform) {
    return this.setTitle(
      str.trim() + ` stats for ${username} - ${platform.toUpperCase()}`
    )
  }

  /** Adds the name of the user that requested the data as in the footer */
  via(author: User) {
    return this.setFooter({
      text: `Requested by ${getShortName(author)}`,
      iconURL: author.displayAvatarURL()
    })
  }
}

/** Embed class for handling errors */
class ErrorEmbed extends CustomEmbed {
  constructor(error: string, int: CommandInteraction, ...args: any[]) {
    super(int, ...args)
    this.type = 'error'
    let sub = error.slice(0, 2048 - 3)
    if (sub.length >= 2048 - 3) sub += '...'
    return this.setColor('RED')
      .setTitle('I got an error from the server')
      .setDescription(sub)
  }
}

/** Embed class for the 'general' command */
class GeneralEmbed extends CustomEmbed {
  type: 'general'

  constructor(
    int: CommandInteraction,
    username: string,
    platform: Platform,
    playType: playType,
    stats: StatsType<'general'>,
    raw: Stats,
    ...args
  ) {
    super(int, ...args)
    this.type = 'general'
    return this.setHeader(
      `General ${
        playType == 'all' ? '' : readablePlayType(playType, true)
      }stats`,
      username,
      platform
    )
      .addOpImage(raw, playType == 'all' ? 'pvp' : playType)
      .addAccount(stats)
      .addMatches(stats)
      .addPerformance(stats)
  }

  /** Adds account stats to the embed */
  addAccount({ account }: GeneralStats) {
    const str = `Level: ${statFormat(account.level)}
    XP: ${statFormat(account.xp)}
    Current Rank: **${
      account.currentRank.tier == 'Unranked' ? '----' : account.currentRank.mmr
    } (${account.currentRank.tier})**
    Max Rank: **${
      account.maxRank.tier == 'Unranked' ? '----' : account.maxRank.mmr
    } (${account.maxRank.tier})**`

    return this.addField('Account stats', str, false)
  }

  /** Adds matches stats to the embed */
  addMatches({ matches }: GeneralStats) {
    const { wins, losses, total } = matches

    const str = `
    Total matches: ${statFormat(total)}
    Total playtime: **${matches.playtime}**
    Wins/Losses: ${[wins, losses].map((e) => statFormat(e)).join('/')}
    Win rate: ${statFormat((wins / total) * 100, { append: '%', decimals: 2 })}
    `.trim()

    return this.addField('Matches', str, true)
  }

  /** Adds performance stats to the embed */
  addPerformance({ performance }: GeneralStats) {
    const { kills, deaths, assists } = performance

    const str = `K/D/A: ${[kills, deaths, assists]
      .map((n) => statFormat(n))
      .join('/')}
    K/D ratio: ${statFormat(kills / deaths, { decimals: 2 })}
    DBNOs: ${statFormat(performance.dbnos)}
    Revives: ${statFormat(performance.revives)}`

    return this.addField('Performance', str, true)
  }
}

/** Embed class for the 'modes' command */
class ModesEmbed extends CustomEmbed {
  type: 'modes'

  constructor(
    int: CommandInteraction,
    username: string,
    platform: Platform,
    playType: strictPlayType,
    stats: StatsType<'modes'>,
    raw: Stats,
    ...args
  ) {
    super(int, ...args)
    this.type = 'modes'
    return this.setHeader(`${readablePlayType(playType)}`, username, platform)
      .addOpImage(raw, playType)
      .addModes(stats, playType)
  }

  /** Exectutes the `addMode` method for every available mode */
  addModes(stats: StatsType<'modes'>, playType: strictPlayType) {
    for (const modeKey in stats) this.addMode(stats[modeKey], modeKey, playType)
    return this
  }

  /** Adds a mode to the embed */
  addMode<T extends PvEMode | PvPMode>(
    mode: T,
    key: string,
    playType: strictPlayType
  ) {
    let title: string,
      body = ''
    if (playType == 'pvp') {
      title = mode.name
    } else title = camelToReadable(key)

    for (const statKey in mode) {
      // @ts-expect-error
      if (statKey != 'name') body += keyValue(statKey, mode[statKey]) + '\n'
    }

    return this.addField(title, body.trim(), true)
  }
}

/** General class for bot 'wp-single' and 'wp-cat' embeds */
class WeaponEmbed extends CustomEmbed {
  /** Adds a category to the embed */
  addCategory(category: WeaponEmbedStats, title?: string) {
    const { CATname } = category
    if (!title) title = `${capitalize(CATname)} category overall`
    for (const playType of ['pvp', 'pve']) {
      if (category[playType]) {
        let str = ''
        const name = category[playType].general.name
        if (name) str += `Name: **${name}**\n`
        for (const key in category[playType].general)
          if (key != 'name')
            str += keyValue(key, category[playType].general[key]) + '\n'
        this.addField(title + ` (${playType})`, str, true)
      }
    }
    return this
  }

  /** Adds a weapon to the embed */
  addWeapon(
    category: WeaponEmbedStats,
    wpKey: string,
    title?: string,
    only?: strictPlayType,
    name?: boolean
  ) {
    if (!title) title = 'Weapon'
    for (const playType in category) {
      if (!playType.includes('name') && !(only && playType != only)) {
        let str = ''
        const wp = (category[playType as strictPlayType].list || {})[wpKey]
        if (name) str += `Name: **${wp.name}**\n`
        if (wp)
          for (const key in wp) {
            if (!['name', 'icon'].includes(key))
              str += keyValue(key, wp[key]) + '\n'
          }
        if (str) this.addField(title + ` (${playType})`, str, true)
      }
    }
    return this
  }

  /** Gets the most chosen weapon from the provided array */
  mostChosenWeapon(list: WeaponEmbedStats['pve']['list']) {
    const values = Object.values(list)
    return values.length > 0
      ? values.sort((a, b) => a.timesChosen - b.timesChosen)[0]
      : undefined
  }
}

/** Embed for the 'wp' command when triggered with a single weapon */
class WeaponSingleEmbed extends WeaponEmbed {
  type: 'wp-single'

  constructor(
    int: CommandInteraction,
    username: string,
    platform: Platform,
    category: StatsType<'wp-single'>,
    raw: Stats,
    ...args
  ) {
    super(int, ...args)
    this.type = 'wp-single'
    const weapon = category.WPkey

    return this.setHeader(
      `${category['pvp'].list[weapon].name} weapon`,
      username,
      platform
    )
      .addWeapon(category, weapon)
      .addOpImage(raw, 'all')
      .addCategory(category, `${capitalize(category.CATname)} category`)
  }
}

/** Embed for the 'wp' command when triggered with a category */
class WeaponCategoryEmbed extends WeaponEmbed {
  type: 'wp-cat'

  constructor(
    int: CommandInteraction,
    username: string,
    platform: Platform,
    category: StatsType<'wp-cat'>,
    raw: Stats,
    ...args
  ) {
    super(int, ...args)
    this.type = 'wp-cat'
    const wpPvP = this.mostChosenWeapon(category.pvp.list),
      wpPvE = this.mostChosenWeapon(category.pve.list)

    this.setHeader(
      `${capitalize(category.CATname)} weapons`,
      username,
      platform
    )
      .addOpImage(raw, 'all')
      .addCategory(category, 'Category overall')

    if (wpPvP?.timesChosen > 0)
      this.addWeapon(category, wpPvP.name, 'Most chosen weapon', 'pvp', true)
    if (wpPvE?.timesChosen > 0)
      this.addWeapon(category, wpPvE.name, 'Most chosen weapon', 'pve', true)
  }
}

/** Embed for the 'op' command */
class OperatorEmbed extends CustomEmbed {
  type: 'op'

  constructor(
    int: CommandInteraction,
    username: string,
    platform: Platform,
    stats: StatsType<'op'>,
    ...args
  ) {
    super(int, ...args)
    this.type = 'op'

    // @ts-expect-error
    const types: strictPlayType[] = Object.keys(stats).filter((m) => !!stats[m])
    if (types.length == 0) return

    this.setHeader(
      `${capitalize(stats[types[0]].name)} operator`,
      username,
      platform
    ).setThumbnail(stats[types[0]].icon)
    for (const playType of types) this.addPlayType(playType, stats[playType])
    return this
  }

  /** Adds opeartor stats for the given playType */
  addPlayType(playType: strictPlayType, stats: OperatorStats) {
    const { kills, deaths, wins, losses } = stats

    const title = readablePlayType(playType)
    const other = (stats.uniqueAbility?.stats || [])
      .map((g) => keyValue(g.name, g.value))
      .join('\n- ')
    const str = `
    Kills/Deaths: ${statFormat(kills / deaths, { decimals: 2 })} (${[
      deaths,
      kills
    ]
      .map((e) => statFormat(e))
      .join(' / ')})
    Win rate: ${statFormat((wins / (wins + losses)) * 100, {
      append: '%',
      decimals: 2
    })}
    Wins/Losses: ${[wins, losses].map((e) => statFormat(e)).join(' / ')}
    Headshots: ${statFormat(stats.headshots)}
    Melee kills: ${statFormat(stats.meleeKills)}
    DBNOs: ${statFormat('dbno' in stats ? stats.dbno : 0)}
    XP: ${statFormat(stats.xp)}
    Playtime: **${readHours(stats.playtime / 60 / 60)}**
    ${other ? `Other:\n- ${other}` : ''}
    `.trim()

    return this.addField(title, str, true)
  }
}

/** Embed for the 'types' command */
class TypesEmbed extends CustomEmbed {
  type: 'types'

  constructor(
    int: CommandInteraction,
    username: string,
    platform: Platform,
    stats: StatsType<'types'>,
    raw: Stats,
    ...args
  ) {
    super(int, ...args)
    this.type = 'types'

    this.setHeader('PvE types', username, platform).addOpImage(raw, 'pve')

    // key is "local" or "coop"
    for (const key in stats) this.addType(key, stats[key])
    return this
  }

  /** Adds a type to the embed */
  addType(name: string, value: StatsType<'types'>['local' | 'coop']) {
    const str = Object.values(value)
      .map((type) => keyValue(type.name, type.bestScore))
      .join('\n')
    return this.addField(camelToReadable(name), str.trim(), true)
  }
}

/** Embed for the 'queue' command */
class QueueEmbed extends CustomEmbed {
  type: 'queue'

  constructor(
    int: CommandInteraction,
    username: string,
    platform: Platform,
    stats: StatsType<'queue'>,
    raw: Stats,
    ...args
  ) {
    super(int, ...args)
    this.type = 'queue'

    this.setHeader('PvP queue', username, platform).addOpImage(raw, 'pvp')
    for (const q of stats) this.addQueue(q)
    return this
  }

  /** Adds a queue type to the embed */
  addQueue(queue: PvpQueue) {
    const { wins, losses, matches, kills, deaths } = queue
    const str = `
    Total matches: ${statFormat(matches)}
    Win rate: ${statFormat((wins / matches) * 100, {
      append: '%',
      decimals: 2
    })}
    Wins/Losses: ${[wins, losses].map((e) => statFormat(e)).join(' / ')}
    Kills/Deaths: ${statFormat(kills / deaths, { decimals: 2 })} (${[
      deaths,
      kills
    ]
      .map((e) => statFormat(e))
      .join(' / ')})
    Playtime: **${readHours(queue.playtime / 60 / 60)}**
    `.trim()

    return this.addField(queue.name, str, true)
  }
}

/** Embed for the 'link' and 'unlink' commands */
class LinkEmbed extends CustomEmbed {
  type: 'link' | 'unlink'

  constructor(
    int: CommandInteraction,
    stats: StatsType<'link' | 'unlink'>,
    ...args
  ) {
    super(int, ...args)
    const { mode, previous, current } = stats
    this.type = mode == 'same' ? 'link' : mode
    this[mode](current, previous)
  }

  /** Changes the color, adds title and description to the embed */
  link(curr: playerEntry, prev: playerEntry) {
    return this.setColor([0, 154, 228])
      .setTitle(`R6S profile ${prev ? 'updated' : 'linked'}`)
      .setD(
        `Your profile is now linked: ${player(curr.username, curr.platform)}`,
        prev
      )
  }

  /** Adds title and descirption to the embed
   * @param curr Unnecessary parameter, keep it `undefined`
   */
  unlink(_ignore: any, prev: playerEntry) {
    return this.setTitle('R6S profile unlinked').setD(undefined, prev)
  }

  /** Changes the color, adds title and description to the embed */
  same(_ignore: any, prev: playerEntry) {
    return this.setColor([0, 154, 228])
      .setTitle('R6S profile unchanged')
      .setDescription(
        `Your linked profile is ${player(prev.username, prev.platform)}`
      )
  }

  /** Adds a custom description */
  private setD(desc = '', prev: playerEntry) {
    return this.setDescription(
      desc +
        (prev
          ? `\nYour previous linked profile was ${player(
              prev.username,
              prev.platform
            )}.`
          : '\nYou had no previous linked profile.')
    )
  }
}
// #endregion

// #region Utility
type playType = 'all' | 'pvp' | 'pve'
type strictPlayType = Exclude<playType, 'all'>

/** Returns the formatted version of a play type */
function readablePlayType(str: strictPlayType, trailingSpace = false) {
  let res = str == 'pvp' ? 'PvP' : 'PvE'
  if (trailingSpace) res += ' '
  return res
}

/** Switch for all the different expected kinds of processed stats to put in EmbedParameters */
type StatsType<T> = T extends 'error'
  ? Error | string
  : T extends 'general'
  ? GeneralStats
  : T extends 'modes'
  ? Stats['pvp']['modes'] | Stats['pve']['modes']
  : T extends 'wp-single' | 'wp-cat'
  ? WeaponEmbedStats
  : T extends 'op'
  ? OperatorEmbedStats
  : T extends 'types'
  ? Stats['pve']['queues']
  : T extends 'queue'
  ? PvpQueue[]
  : T extends 'link' | 'unlink'
  ? LinkData
  : false

/** Parameters for the createEmbed method */
interface EmbedParameters<T> {
  embedType: T
  int: CommandInteraction
  platform: Platform
  playType?: playType
  /** The full stats object */
  raw?: Stats
  /** The processed stats object */
  stats?: StatsType<T>
  username: string
}

/** Checks whether the argument is a weapon key */
function isWeaponName(str: string): str is keyof typeof constants.WEAPONS {
  return typeof str == 'string' && Object.keys(constants.WEAPONS).includes(str)
}

/** Checks whether the argument is a weapon category
 * @example isWeaponTypeIdLike('assault') // true
 * @example isWeaponTypeIdLike('Assault Rifle') // false
 */
function isWeaponTypeId(str: string): str is WeaponTypeId {
  return (
    typeof str == 'string' &&
    Object.values(constants.WEAPONTYPES)
      .map((weaponTypeObject) => weaponTypeObject.id as string)
      .includes(str)
  )
}

/** Returns the readable weapon type from a weapon type id
 * @example getWeaponTypeName('assault') // 'Assault Rifle'
 */
function getWeaponTypeName(id: WeaponTypeId) {
  return Object.values(constants.WEAPONTYPES).find((wt) => wt.id == id)?.name
}

/** Compares play regions to determine which is the most recent
 * @param regions The regions to compare
 */
function getBestRegion(regions: RankSeason['regions']) {
  return Object.values(regions)
    .map((r) => r.boards['pvp_ranked'])
    .sort((a, b) => b.current.mmr - a.current.mmr)[0]
}

/** Returns the stats of the most played operator.
 * Stats may not be reliable if `'all'` is used as `type`, it might be better to only get the name and re-parse the stats */
function getMostPlayedOperator(rawStats: Stats, type?: playType) {
  let operators: Record<OperatorId, OperatorStats>
  if (!type || type == 'all')
    operators = mergeAndSum(rawStats.pve.operators, rawStats.pvp.operators)
  else operators = rawStats[type].operators

  const mostUsedOp = Object.values(operators).sort(
    (a, b) => -(a.playtime - b.playtime)
  )[0]
  return mostUsedOp
}

/** Returns a formatted version of key/value stat objects */
function keyValue(key: string, value: number) {
  return `${camelToReadable(key)}: ${statFormat(value)}`
}

interface statOptions {
  append?: string
  decimals?: number
}
/** Returns a readable version of numbers */
function statFormat(value: number, options: statOptions = {}) {
  return (
    `**${readNumber(value, options.decimals || 0) || value}**` +
    (options.append || '')
  )
}

/** Returns an ID to use for caching */
function cacheID(username: string, platform: Platform) {
  return username + '|' + platform
}

/** Returns the formatted username of a player */
function player(username: string, platform: string, bold = true) {
  const b = bold ? '**' : ''
  return b + username + b + ' - ' + b + platform.toUpperCase() + b
}
// #endregion

// #region Processed stats formats
interface GeneralStats {
  account: {
    level: number
    xp: number
    currentRank: {
      mmr: number
      tier: string
    }
    maxRank: {
      mmr: number
      tier: string
    }
  }

  matches: {
    losses: number
    playtime: string
    total: number
    wins: number
  }

  performance: {
    assists: number
    dbnos: number
    deaths: number
    kills: number
    revives: number
  }
}

interface WeaponEmbedStats extends Record<strictPlayType, WeaponCategory> {
  WPkey?: WeaponName
  CATname: WeaponTypeName
}

interface OperatorEmbedStats
  extends Partial<Record<strictPlayType, OperatorStats>> {}

interface LinkData {
  previous?: playerEntry
  current?: playerEntry
  mode: 'link' | 'unlink' | 'same'
}
// #endregion

export class RainbowAPI extends API<'r6'> {
  constructor() {
    super('r6', 'Rainbow 6 Siege')
  }

  /** Checks request results to determine whether there was an error and if so, returns an `ErrorEmbed` */
  errorCheck(
    stats: Error | Stats,
    username: string,
    platform: Platform,
    int: CommandInteraction
  ) {
    if (stats instanceof Array) throw new Error('Multiple results')
    if (stats === undefined || stats instanceof Error) {
      let err: Error
      if (stats instanceof Error) err = stats
      else err = new Error(`Can't get stats for the requested user.`)
      return this.createEmbed({
        embedType: 'error',
        int,
        platform,
        stats: err,
        username
      })
    }
  }

  /** Gets the saved credentials of a user from the database */
  checkDatabase(discordUser: UserResolvable) {
    const id = client.users.resolveId(discordUser)
    return this.get(id)
  }

  /** Function that chooses which type of embed to build and returns the chosen one */
  async createEmbed<T extends embedType_Type>({
    embedType,
    int,
    platform,
    playType,
    raw,
    stats,
    username
  }: EmbedParameters<T>) {
    if (embedType == 'error') {
      return new ErrorEmbed(
        (stats as StatsType<'error'>) instanceof Error
          ? // @ts-expect-error
            stats.message
          : (stats as StatsType<'error'>),
        int
      )
    }

    let embed: CustomEmbed

    // Type guards are necessary, just copy & paste them block-by-block
    if (embedType == 'general') {
      embed = new GeneralEmbed(
        int,
        username,
        platform,
        playType,
        stats as StatsType<'general'>,
        raw
      )
    } else if (embedType == 'modes') {
      if (playType == 'all') playType = 'pvp'
      embed = new ModesEmbed(
        int,
        username,
        platform,
        playType,
        stats as StatsType<'modes'>,
        raw
      )
    } else if (embedType == 'wp-single') {
      embed = new WeaponSingleEmbed(
        int,
        username,
        platform,
        stats as StatsType<'wp-single'>,
        raw
      )
    } else if (embedType == 'wp-cat') {
      embed = new WeaponCategoryEmbed(
        int,
        username,
        platform,
        stats as StatsType<'wp-cat'>,
        raw
      )
    } else if (embedType == 'op') {
      embed = new OperatorEmbed(
        int,
        username,
        platform,
        stats as StatsType<'op'>
      )
    } else if (embedType == 'types') {
      embed = new TypesEmbed(
        int,
        username,
        platform,
        stats as StatsType<'types'>,
        raw
      )
    } else if (embedType == 'queue') {
      embed = new QueueEmbed(
        int,
        username,
        platform,
        stats as StatsType<'queue'>,
        raw
      )
    } else if (['link', 'unlink'].includes(embedType)) {
      embed = new LinkEmbed(int, stats as StatsType<'link' | 'unlink'>)
    }

    return embed
  }

  // #region API wrappers
  /** Returns an ID from the API */
  async getID(username: string, platform: Platform, type?: 'userId' | 'id') {
    return (ensureOne(await r6api.findByUsername(platform, username)) || {})[
      type || platform == 'uplay' ? 'userId' : 'id'
    ]
  }

  /** Returns the level info for a player from the API */
  async getLevelInfo(id: string, platform: Platform) {
    return ensureOne(await r6api.getProgression(platform, id))
  }

  /** Returns the rank info for a player from the API */
  async getRank(id: string, platform: Platform) {
    return ensureOne(await r6api.getRanks(platform, id, { seasonIds: [-1] }))
  }

  /** Returns a username from the API */
  async getUsername(id: string, platform: Platform) {
    return (ensureOne(await r6api.findById(platform, id)) || {})['username']
  }

  /** Returns all the stats for a player from the API*/
  async getStats(id: string, platform: Platform, useCache = true) {
    let res: Stats, error: Error

    try {
      if (useCache)
        res =
          cache.get(cacheID(id, platform)) ||
          ensureOne(await r6api.getStats(platform, id))
      else res = ensureOne(await r6api.getStats(platform, id))
    } catch (e) {
      if (typeof e == 'string') error = new Error(e)
      else if (e instanceof Error) error = e

      if (
        error.message == 'Stripped in prod' &&
        (await this.isInvalidId(id, platform))
      )
        error = new Error('Invalid id.')
    }
    if (error) {
      error.message += `\nParameters:\n- Id: \`${id}\`\n- Platform: \`${platform}\``
      return error
    } else {
      if (useCache) cache.add(cacheID(id, platform), res)
      return res
    }
  }

  /** Returns whether an ID is not valid */
  async isInvalidId(id: string, platform: Platform) {
    let username: string
    try {
      username = await this.getUsername(id, platform)
    } catch {
      return true
    }
    return !username
  }
  // #endregion

  // #region Command methods
  async general(
    int: CommandInteraction,
    username: string,
    platform: Platform,
    playType: playType
  ) {
    const id = await this.getID(username, platform)
    const rawStats = await this.getStats(id, platform)
    const check = await this.errorCheck(rawStats, id, platform, int)
    if (check || rawStats instanceof Error) return check

    const processedStats = {} as GeneralStats
    let finalStats: Stats['pvp']['general'] | Stats['pve']['general']
    if (playType == 'all')
      finalStats = mergeAndSum(rawStats.pvp.general, rawStats.pve.general)
    else finalStats = rawStats[playType].general

    const levelInfo = await this.getLevelInfo(id, platform)
    const rankInfo = await this.getRank(id, platform)
    const region = getBestRegion(
      rankInfo.seasons[Math.max(...Object.keys(rankInfo.seasons).map(parseInt))]
        .regions
    )

    processedStats.account = {
      currentRank: {
        mmr: region.current.mmr,
        tier: region.current.name
      },
      level: levelInfo.level,
      maxRank: {
        mmr: region.max.mmr,
        tier: region.max.name
      },
      xp: levelInfo.xp
    }

    processedStats.matches = {
      losses: finalStats.losses,
      playtime: readHours(finalStats.playtime / 60 / 60),
      total: finalStats.matches,
      wins: finalStats.wins
    }

    processedStats.performance = {
      assists: finalStats.assists,
      // @ts-expect-error
      dbnos: finalStats.dbno,
      deaths: finalStats.deaths,
      kills: finalStats.kills,
      revives: finalStats.revives
    }

    return this.createEmbed({
      embedType: 'general',
      int,
      platform,
      playType,
      raw: rawStats,
      stats: processedStats,
      username
    })
  }

  async modes(
    int: CommandInteraction,
    username: string,
    platform: Platform,
    playType: strictPlayType
  ) {
    const id = await this.getID(username, platform)
    const rawStats = await this.getStats(id, platform)
    const check = await this.errorCheck(rawStats, id, platform, int)
    if (check || rawStats instanceof Error) return check

    const processedStats = rawStats[playType].modes

    return this.createEmbed({
      embedType: 'modes',
      int,
      platform,
      playType,
      raw: rawStats,
      stats: processedStats,
      username
    })
  }

  async wp(
    int: CommandInteraction,
    username: string,
    platform: Platform,
    wpOrCat: WeaponName | WeaponTypeId
  ) {
    const id = await this.getID(username, platform)
    const rawStats = await this.getStats(id, platform)
    const check = await this.errorCheck(rawStats, id, platform, int)
    if (check || rawStats instanceof Error) return check

    var processedStats: WeaponEmbedStats
    if (isWeaponName(wpOrCat)) {
      var CATname: WeaponTypeId
      let cat: WeaponTypeId
      for (cat in rawStats.pvp.weapons) {
        if (Object.keys(rawStats.pvp.weapons[cat].list).includes(wpOrCat))
          CATname = cat
      }
      processedStats = {
        WPkey: wpOrCat,
        CATname: getWeaponTypeName(CATname),
        pve: rawStats.pve.weapons[CATname],
        pvp: rawStats.pvp.weapons[CATname]
      }
      return this.createEmbed({
        embedType: 'wp-single',
        int,
        platform,
        stats: processedStats,
        raw: rawStats,
        username
      })
    } else if (isWeaponTypeId(wpOrCat)) {
      processedStats = {
        CATname: getWeaponTypeName(wpOrCat),
        pve: rawStats.pve.weapons[wpOrCat],
        pvp: rawStats.pvp.weapons[wpOrCat]
      }
      return this.createEmbed({
        embedType: 'wp-cat',
        int,
        platform,
        stats: processedStats,
        raw: rawStats,
        username
      })
    }
  }

  async op(
    int: CommandInteraction,
    username: string,
    platform: Platform,
    operator: OperatorId | 'auto'
  ) {
    const id = await this.getID(username, platform)
    const rawStats = await this.getStats(id, platform)
    const check = await this.errorCheck(rawStats, id, platform, int)
    if (check || rawStats instanceof Error) return check

    if (operator == 'auto') {
      const str = getMostPlayedOperator(rawStats, 'all').name as OperatorId
      operator = str
    }

    const processedStats: OperatorEmbedStats = {}
    processedStats.pvp = rawStats.pvp.operators[operator] || undefined
    processedStats.pve = rawStats.pve.operators[operator] || undefined

    if (!processedStats.pvp && !processedStats.pve)
      return this.createEmbed({
        embedType: 'error',
        int,
        platform,
        stats: 'No weapon stats have been found',
        username
      })

    return this.createEmbed({
      embedType: 'op',
      int,
      platform,
      stats: processedStats,
      username
    })
  }

  async types(int: CommandInteraction, username: string, platform: Platform) {
    const id = await this.getID(username, platform)

    const rawStats = await this.getStats(id, platform)
    const check = await this.errorCheck(rawStats, id, platform, int)
    if (check || rawStats instanceof Error) return check

    const processedStats = rawStats.pve.queues

    return this.createEmbed({
      embedType: 'types',
      int,
      platform,
      raw: rawStats,
      stats: processedStats,
      username
    })
  }

  async queue(int: CommandInteraction, username: string, platform: Platform) {
    const id = await this.getID(username, platform)

    const rawStats = await this.getStats(id, platform)
    const check = await this.errorCheck(rawStats, id, platform, int)
    if (check || rawStats instanceof Error) return check

    const processedStats = Object.values(rawStats.pvp.queues).sort(
      (a, b) => b.matches - a.matches
    )

    return this.createEmbed({
      embedType: 'queue',
      int,
      platform,
      raw: rawStats,
      stats: processedStats,
      username
    })
  }

  /** Use the udpated `username` and `platform` */
  async link(int: CommandInteraction, username: string, platform: Platform) {
    let mode: 'same' | 'link'

    const prev = await this.checkDatabase(int.user),
      next: playerEntry = { username, platform }

    if (username) {
      const id = await this.getID(username, platform)
      if (!id)
        return this.createEmbed({
          embedType: 'error',
          int,
          platform,
          stats: `${player(username, platform)} is not a valid player.`,
          username
        })

      mode =
        prev?.username == next.username && prev?.platform == next.platform
          ? 'same'
          : 'link'
    } else mode = 'same'

    if (mode == 'link')
      this.set({
        id: int.user.id,
        username,
        platform,
        created_at: new Date().toISOString()
      })
    return this.createEmbed({
      embedType: 'link',
      int,
      platform,
      stats: {
        previous: prev,
        current: next,
        mode
      },
      username
    })
  }

  async unlink(int: CommandInteraction) {
    const prev = await this.checkDatabase(int.user)

    if (prev) await this.delete(int.user.id)

    return this.createEmbed({
      embedType: 'unlink',
      int,
      platform: undefined,
      stats: {
        previous: prev,
        mode: 'unlink'
      },
      username: undefined
    })
  }
  // #endregion
}

export const ApiLoader = RainbowAPI
