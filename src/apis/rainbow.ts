import R6API, { Stats, Operator, OperatorStats, PvPMode, PvEMode, WeaponType, WeaponCategory, WeaponName, RankSeason, StatsType as TypesObject, StatsQueue } from 'r6api.js' // eslint-disable-line no-unused-vars
import { Platform } from 'r6api.js' // eslint-disable-line no-unused-vars
import { isWeaponName, isWeaponType } from 'r6api.js/ts-utils'
import { API, getShortName, ensureOne, mergeAndSum, readHours, readNumber, enforceType, camelToReadable, capitalize, PartialRecord, Cache, resolver } from '../utils/utils' // eslint-disable-line no-unused-vars
import { RichEmbed, User, UserResolvable } from 'discord.js' // eslint-disable-line no-unused-vars
import { CommandoMessage } from 'discord.js-commando' // eslint-disable-line no-unused-vars

const { UbisoftEmail, UbisoftPassword } = process.env
const r6api = new R6API(UbisoftEmail, UbisoftPassword)

export const constants = r6api.constants

var cache = new Cache('Rainbow 6 Siege')

/* API data store structure:
  "Discord ID": [
    "1234-1234-1234-1234" -> id
    "xbl" -> platform
  ]
*/

// #region Embeds
/** Ok, I know this is stupid, but it's kind of necessary */
type embedType_Type = 'error' | 'general' | 'modes' | 'wp-single' | 'wp-cat' | 'op' | 'types' | 'queue' | 'link' | 'unlink'

/** Custom embed class that acts as base for other embeds */
class CustomEmbed extends RichEmbed {
  type: embedType_Type

  constructor(msg: CommandoMessage, ...args) {
    super(...args)
    return this.setTimestamp()
      .setAuthor('Rainbow 6 Siege Stats', 'https://i.imgur.com/RgoDkpy.png')
      .setColor('WHITE')
      .via(msg.author)
  }

  /** Adds the image of the most played operator to the embed
   * @param rawStats The raw stats object
   * @param type The playType to search the operator in
   */
  addOpImage(rawStats: Stats, type: playType) {
    const mostUsedOp = getMostPlayedOperator(rawStats, type)
    return this.setThumbnail(mostUsedOp.badge)
  }

  /** Adds a title to the embed with the following format:
   * 
   * _`str` stats for `username` - `PLATFORM`_ */
  setHeader(str: string, username: string, platform: Platform) {
    return this.setTitle(str.trim() + ` stats for ${username} - ${platform.toUpperCase()}`)
  }

  /** Adds the name of the user that requested the data as in the footer */
  via(author: User) {
    return this.setFooter(`Requested by ${getShortName(author)}`, author.displayAvatarURL)
  }
}

/** Embed class for handling errors */
class ErrorEmbed extends CustomEmbed {
  constructor(error: string, msg: CommandoMessage, ...args: any[]) {
    super(msg, ...args)
    this.type = 'error'
    return this.setColor('RED')
      .setTitle('I got an error from the server')
      .setDescription(error)
  }
}


/** Embed class for the 'general' command */
class GeneralEmbed extends CustomEmbed {
  type: 'general'

  constructor(msg: CommandoMessage, username: string, platform: Platform, playType: playType, stats: StatsType<'general'>, raw: Stats, ...args) {
    super(msg, ...args)
    this.type = 'general'
    return this.setHeader(`General ${playType == 'all' ? '' : readablePlayType(playType, true)}stats`, username, platform)
      .addOpImage(raw, playType)
      .addAccount(stats)
      .addMatches(stats)
      .addPerformance(stats)
  }

  /** Adds account stats to the embed */
  addAccount({ account }: GeneralStats) {
    const str = `Level: ${statFormat(account.level)}
    XP: ${statFormat(account.xp)}
    Current Rank: **${account.currentRank.tier == 'Unranked' ? '----' : account.currentRank.mmr} (${account.currentRank.tier})**
    Max Rank: **${account.maxRank.tier == 'Unranked' ? '----' : account.maxRank.mmr} (${account.maxRank.tier})**`

    return this.addField('Account stats', str, false)
  }

  /** Adds matches stats to the embed */
  addMatches({ matches }: GeneralStats) {
    const { wins, losses, total } = matches

    const str = `
    Total matches: ${statFormat(total)}
    Total playtime: **${matches.playtime}**
    Wins/Losses: ${[wins, losses].map(e => statFormat(e)).join('/')}
    Win rate: ${statFormat((wins / total) * 100, '%')}
    `.trim()

    return this.addField('Matches', str, true)
  }

  /** Adds performance stats to the embed */
  addPerformance({ performance }: GeneralStats) {
    const { kills, deaths, assists } = performance

    const str = `K/D/A: ${[kills, deaths, assists].map(n => statFormat(n)).join('/')}
    K/D ratio: ${statFormat(kills / deaths)}
    DBNOs: ${statFormat(performance.dbnos)}
    Revives: ${statFormat(performance.revives)}`

    return this.addField('Performance', str, true)
  }
}

/** Embed class for the 'modes' command */
class ModesEmbed extends CustomEmbed {
  type: 'modes'

  constructor(msg: CommandoMessage, username: string, platform: Platform, playType: strictPlayType, stats: StatsType<'modes'>, raw: Stats, ...args) {
    super(msg, ...args)
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
  addMode<T extends PvEMode | PvPMode>(mode: T, key: string, playType: strictPlayType) {
    let title: string,
      body = ''
    if (playType == 'pvp') {
      if (!enforceType<PvPMode>(mode)) return
      title = mode.name
    } else title = camelToReadable(key)

    for (const statKey in mode) {
      // @ts-ignore
      if (statKey != 'name') body += keyValue(statKey, mode[statKey])
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
    for (const playType in category) {
      if (!playType.includes('name')) {
        if (!enforceType<strictPlayType>(playType)) return
        let str = ''
        for (const key in category[playType].general) str += keyValue(key, category[playType].general[key])
        this.addField(title + ` (${playType})`, str, true)
      }
    }
    return this
  }

  /** Adds a weapon to the embed */
  addWeapon(category: WeaponEmbedStats, wpName: WeaponName, title?: string, only?: strictPlayType) {
    if (!title) title = 'Weapon'
    for (const playType in category) {
      if (!playType.includes('name')) {
        if (only && playType != only) return
        if (!enforceType<strictPlayType>(playType)) return
        let str = ''
        const wp = category[playType].list.find(wp => wp.name == wpName)
        if (wp) for (const key in wp) {
          if (key != 'name') str += keyValue(key, wp[key])
        }
        if (str) this.addField(title + ` (${playType})`, str, true)
      }
    }
    return this
  }

  /** Gets the most chosen weapon from the provided array */
  mostChosenWeapon(list: WeaponEmbedStats['pve']['list']) {
    return list.sort((a, b) => a.timesChosen - b.timesChosen)[0]
  }
}

/** Embed for the 'wp' command when triggered with a single weapon */
class WeaponSingleEmbed extends WeaponEmbed {
  type: 'wp-single'

  constructor(msg: CommandoMessage, username: string, platform: Platform, category: StatsType<'wp-single'>, ...args) {
    super(msg, ...args)
    this.type = 'wp-single'
    const weapon = category.WPname
    return this.setHeader(`${weapon} weapon`, username, platform)
      .addWeapon(category, weapon)
      .addCategory(category, `${capitalize(category.CATname)} category`)
  }
}

/** Embed for the 'wp' command when triggered with a category */
class WeaponCategoryEmbed extends WeaponEmbed {
  type: 'wp-cat'

  constructor(msg: CommandoMessage, username: string, platform: Platform, category: StatsType<'wp-cat'>, ...args) {
    super(msg, ...args)
    this.type = 'wp-cat'
    const wpPvP = this.mostChosenWeapon(category.pvp.list),
      wpPvE = this.mostChosenWeapon(category.pve.list)
    return this.setHeader(`${capitalize(category.CATname)} weapons`, username, platform)
      .addCategory(category, 'Category overall')
      .addWeapon(category, wpPvP.name, 'Most chosen weapon', 'pvp')
      .addWeapon(category, wpPvE.name, 'Most chosen weapon', 'pve')
  }
}

/** Embed for the 'op' command */
class OperatorEmbed extends CustomEmbed {
  type: 'op'

  constructor(msg: CommandoMessage, username: string, platform: Platform, stats: StatsType<'op'>, ...args) {
    super(msg, ...args)
    this.type = 'op'

    // @ts-ignore
    const types: strictPlayType[] = Object.keys(stats).filter(m => !!stats[m])
    if (types.length == 0) return

    this.setHeader(`${capitalize(stats[types[0]].name)} operator`, username, platform)
      .setThumbnail(stats[types[0]].badge)
    for (const playType of types) this.addPlayType(playType, stats[playType])
    return this
  }

  /** Adds opeartor stats for the given playType */
  addPlayType(playType: strictPlayType, stats: OperatorStats) {
    const { kills, deaths, wins, losses } = stats

    const title = readablePlayType(playType)
    const str = `
    Kills/Deaths: ${statFormat((kills / deaths))} (${[deaths, kills].map(e => statFormat(e)).join(' / ')})
    Win rate: ${statFormat((wins / (wins + losses)) * 100, '%')}
    Wins/Losses: ${[wins, losses].map(e => statFormat(e)).join(' / ')}
    Headshots: ${statFormat(stats.headshots)}
    Melee kills: ${statFormat(stats.meleeKills)}
    DBNOs: ${statFormat(stats.dbno)}
    XP: ${statFormat(stats.xp)}
    Playtime: **${readHours(stats.playtime / 60 / 60)}**
    Other:
      ${stats.gadget.map(g => keyValue(g.name, g.value)).join('\n  ')}
    `.trim()

    return this.addField(title, str, true)
  }
}

/** Embed for the 'types' command */
class TypesEmbed extends CustomEmbed {
  type: 'types'

  constructor(msg: CommandoMessage, username: string, platform: Platform, stats: StatsType<'types'>, raw: Stats, ...args) {
    super(msg, ...args)
    this.type = 'types'

    this.setHeader('PvE types', username, platform)
      .addOpImage(raw, 'pve')
    for (const key in stats) this.addType(key, stats[key])
    return this
  }

  /** Adds a type to the embed */
  addType(name: string, value: TypesObject) {
    let str = ''
    for (const key in value)
      str += keyValue(key, value[key]) + '\n'
    return this.addField(name, str.trim(), true)
  }
}

/** Embed for the 'queue' command */
class QueueEmbed extends CustomEmbed {
  type: 'queue'

  constructor(msg: CommandoMessage, username: string, platform: Platform, stats: StatsType<'queue'>, raw: Stats, ...args) {
    super(msg, ...args)
    this.type = 'queue'

    this.setHeader('PvP queue', username, platform)
      .addOpImage(raw, 'pvp')
    for (const q of stats) this.addQueue(q)
    return this
  }

  /** Adds a queue type to the embed */
  addQueue(queue: StatsQueue) {
    const { wins, losses, matches, kills, deaths } = queue
    const str = `
    Total matches: ${statFormat(matches)}
    Win rate: ${statFormat(wins / matches * 100, '%')}
    Wins/Losses: ${[wins, losses].map(e => statFormat(e)).join(' / ')}
    Kills/Deaths: ${statFormat((kills / deaths))} (${[deaths, kills].map(e => statFormat(e)).join(' / ')})
    Playtime: **${readHours(queue.playtime / 60 / 60)}**
    `.trim()

    return this.addField(queue.name, str, true)
  }
}

/** Embed for the 'link' and 'unlink' commands */
class LinkEmbed extends CustomEmbed {
  type: 'link' | 'unlink'

  constructor(msg: CommandoMessage, stats: StatsType<'link' | 'unlink'>, ...args) {
    super(msg, ...args)
    const { mode, previous, current } = stats
    this.type = mode == 'same' ? 'link' : mode
    this[mode](current, previous)
  }

  /** Changes the color, adds title and description to the embed */
  link(curr: string, prev: string) {
    return this.setColor([0, 154, 228])
      .setTitle(`R6S profile ${prev ? 'updated' : 'linked'}`)
      .setD(`Your profile is now linked: ${curr}`, prev)
  }

  /** Adds title and descirption to the embed
   * @param curr Unnecessary parameter, keep it `undefined` 
   */
  unlink(curr: string, prev: string) {
    return this.setTitle('R6S profile unlinked')
      .setD(undefined, prev)
  }

  /** Changes the color, adds title and description to the embed */
  same(curr: string) {
    return this.setColor([0, 154, 228])
      .setTitle('R6S profile unchanged')
      .setDescription(`Your linked profile is ${curr}`)
  }

  /** Adds a custom description */
  private setD(desc = '', prev: string) {
    return this.setDescription(desc + (prev ? `\nYour previous linked profile was ${prev}.` : '\nYou had no previous linked profile.'))
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
type StatsType<T> =
  T extends 'error' ? Error | string :
  T extends 'general' ? GeneralStats :
  T extends 'modes' ? Stats['pvp']['modes'] | Stats['pve']['modes'] :
  T extends 'wp-single' | 'wp-cat' ? WeaponEmbedStats :
  T extends 'op' ? OperatorEmbedStats :
  T extends 'types' ? Stats['pve']['types'] :
  T extends 'queue' ? StatsQueue[] :
  T extends 'link' | 'unlink' ? LinkData :
  false;

/** Parameters for the createEmbed method */
interface EmbedParameters<T> {
  embedType: T
  id: string
  msg: CommandoMessage
  platform: Platform
  playType?: playType
  /** The full stats object */
  raw?: Stats
  /** The processed stats object */
  stats?: StatsType<T>
}

/** Checks wheter the argument is a platform */
export function isPlatform(str: string): str is Platform {
  return ['uplay', 'xbl', 'psn'].includes(str)
}

/** Compares play regions to determine which is the most recent
 * @param regions The regions to compare
 */
function getLastPlayedRegion(regions: RankSeason['regions']) {
  const key = Object.values(regions).sort((a, b) => {
    const ad = new Date(a.updateTime),
      bd = new Date(b.updateTime)
    return -(ad.getTime() - bd.getTime()) // from the most recent to the oldest
  })[0].region
  return regions[key]
}

/** Returns the stats of the most played operator. 
 * Stats may not be reliable if `'all'` is used as `type`, it might be better to only get the name and re-parse the stats */
function getMostPlayedOperator(rawStats: Stats, type?: playType) {
  let operators: Record<Operator, OperatorStats>
  if (!type || type == 'all') operators = mergeAndSum(rawStats.pve.operators, rawStats.pvp.operators)
  else operators = rawStats[type].operators

  const mostUsedOp = Object.values(operators).sort((a, b) => -(a.playtime - b.playtime))[0]
  return mostUsedOp
}

/** Returns a formatted version of key/value stat objects */
function keyValue(key: string, value: number) {
  return `${camelToReadable(key)}: ${statFormat(value)}`
}

/** Returns a readable version of numbers */
function statFormat(value: number, append?: string) {
  return `**${readNumber(value) || value}**` + (append || '')
}

/** Returns an ID to use for caching */
function cacheID(id: string, platform: Platform) {
  return id + '|' + platform
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
  WPname?: WeaponName
  CATname: WeaponType
}

interface OperatorEmbedStats extends PartialRecord<strictPlayType, OperatorStats> { }

interface LinkData {
  previous?: string
  current?: string
  mode: 'link' | 'unlink' | 'same'
}
// #endregion

export class RainbowAPI extends API {
  constructor() {
    super('r6', 'Rainbow 6 Siege')
  }

  /** Checks request results to determine whether there was an error and if so, returns an `ErrorEmbed` */
  errorCheck(stats: Error | Stats, id: string, platform: Platform, msg: CommandoMessage) {
    if (stats instanceof Array) throw new Error('Multiple results')
    if (stats === undefined || stats instanceof Error) {
      let err: Error
      if (stats instanceof Error) err = stats
      else err = new Error('Can\'t get stats.')
      return this.createEmbed({
        embedType: 'error',
        id,
        msg,
        platform,
        stats: err
      })
    }
  }

  /** Gets the saved credentials of a user from the database */
  checkDatabase(discordUser: UserResolvable): [string, Platform] {
    const id = resolver.resolveUserID(discordUser)
    return this.store.get(id)
  }

  /** Function that chooses which type of embed to build and returns the chosen one */
  async createEmbed<T extends embedType_Type>({ id, embedType, msg, platform, playType, raw, stats }: EmbedParameters<T>) {
    if (embedType == 'error') {
      if (!enforceType<StatsType<'error'>>(stats)) return
      return new ErrorEmbed(stats instanceof Error ? stats.message : stats, msg)
    }

    const username = await this.getUsername(id, platform)
    let embed: CustomEmbed

    // Type guards are necessary, just copy & paste them block-by-block
    if (embedType == 'general') {
      if (!enforceType<StatsType<'general'>>(stats)) return
      embed = new GeneralEmbed(msg, username, platform, playType, stats, raw)
    } else if (embedType == 'modes') {
      if (!enforceType<StatsType<'modes'>>(stats)) return
      if (playType == 'all') playType = 'pvp'
      embed = new ModesEmbed(msg, username, platform, playType, stats, raw)
    } else if (embedType == 'wp-single') {
      if (!enforceType<StatsType<'wp-single'>>(stats)) return
      embed = new WeaponSingleEmbed(msg, username, platform, stats)
    } else if (embedType == 'wp-cat') {
      if (!enforceType<StatsType<'wp-cat'>>(stats)) return
      embed = new WeaponCategoryEmbed(msg, username, platform, stats)
    } else if (embedType == 'op') {
      if (!enforceType<StatsType<'op'>>(stats)) return
      embed = new OperatorEmbed(msg, username, platform, stats)
    } else if (embedType == 'types') {
      if (!enforceType<StatsType<'types'>>(stats)) return
      embed = new TypesEmbed(msg, username, platform, stats, raw)
    } else if (embedType == 'queue') {
      if (!enforceType<StatsType<'queue'>>(stats)) return
      embed = new QueueEmbed(msg, username, platform, stats, raw)
    } else if (['link', 'unlink'].includes(embedType)) {
      if (!enforceType<StatsType<'link' | 'unlink'>>(stats)) return
      embed = new LinkEmbed(msg, stats)
    }

    return embed
  }

  // #region API wrappers
  /** Returns an ID from the API */
  async getID(username: string, platform: Platform) {
    return (ensureOne(await r6api.getId(platform, username)) || {})['id']
  }

  /** Returns the level info for a player from the API */
  async getLevelInfo(id: string, platform: Platform) {
    return ensureOne(await r6api.getLevel(platform, id))
  }

  /** Returns the rank info for a player from the API */
  async getRank(id: string, platform: Platform) {
    return ensureOne(await r6api.getRank(platform, id, { seasons: [-1] }))
  }

  /** Returns a username from the API */
  async getUsername(id: string, platform: Platform) {
    return (ensureOne(await r6api.getUsername(platform, id)) || {})['username']
  }

  /** Returns all the stats for a player from the API*/
  async getStats(id: string, platform: Platform, useCache = true) {
    let res: Stats,
      error: Error

    try {
      if (useCache) res = cache.get(cacheID(id, platform)) || ensureOne(await r6api.getStats(platform, id))
      else res = ensureOne(await r6api.getStats(platform, id))
    } catch (e) {
      if (typeof e == 'string') error = new Error(e)
      else if (e instanceof Error) error = e

      if (error.message == 'Stripped in prod' && this.isInvalidId(id, platform))
        error = new Error('Invalid id.')
    }
    error.message += `\nParameters:\n- Id: \`${id}\`\n- Platform: \`${platform}\``
    if (error) return error
    else {
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
  async general(msg: CommandoMessage, id: string, platform: Platform, playType: playType) {
    const rawStats = await this.getStats(id, platform)
    const check = this.errorCheck(rawStats, id, platform, msg)
    if (check) return check
    if (!enforceType<Stats>(rawStats)) return

    let processedStats: GeneralStats
    let finalStats: Stats['pvp']['general'] | Stats['pve']['general']
    if (playType == 'all') finalStats = mergeAndSum(rawStats.pvp.general, rawStats.pve.general)
    else finalStats = rawStats[playType].general

    const levelInfo = await this.getLevelInfo(id, platform)
    const rankInfo = await this.getRank(id, platform)
    const region = getLastPlayedRegion(rankInfo.seasons[Math.max(...Object.keys(rankInfo.seasons).map(parseInt))])

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
      dbnos: finalStats.dbno,
      deaths: finalStats.deaths,
      kills: finalStats.kills,
      revives: finalStats.revives
    }

    return this.createEmbed({
      id,
      embedType: 'general',
      msg,
      platform,
      playType,
      raw: rawStats,
      stats: processedStats
    })
  }

  async modes(msg: CommandoMessage, id: string, platform: Platform, playType: strictPlayType) {
    const rawStats = await this.getStats(id, platform)
    const check = this.errorCheck(rawStats, id, platform, msg)
    if (check) return check
    if (!enforceType<Stats>(rawStats)) return

    const processedStats = rawStats[playType].modes

    return this.createEmbed({
      id,
      embedType: 'modes',
      msg,
      platform,
      playType,
      raw: rawStats,
      stats: processedStats
    })
  }

  async wp(msg: CommandoMessage, id: string, platform: Platform, wpOrCat: WeaponName | WeaponType) {
    const rawStats = await this.getStats(id, platform)
    const check = this.errorCheck(rawStats, id, platform, msg)
    if (check) return check
    if (!enforceType<Stats>(rawStats)) return

    var processedStats: WeaponEmbedStats
    if (isWeaponName(wpOrCat)) {
      var CATname: WeaponType
      for (const cat in rawStats.pvp.weapons) {
        if (enforceType<WeaponType>(cat) && rawStats.pvp.weapons[cat].list.some(wp => wp.name == wpOrCat))
          CATname = cat
      }
      processedStats = {
        WPname: wpOrCat,
        CATname,
        pve: rawStats.pve.weapons[CATname],
        pvp: rawStats.pvp.weapons[CATname]
      }
      return this.createEmbed({
        embedType: 'wp-single',
        id,
        msg,
        platform,
        stats: processedStats
      })
    } else if (isWeaponType(wpOrCat)) {
      processedStats = {
        CATname: wpOrCat,
        pve: rawStats.pve.weapons[wpOrCat],
        pvp: rawStats.pvp.weapons[wpOrCat]
      }
      return this.createEmbed({
        embedType: 'wp-cat',
        id,
        msg,
        platform,
        stats: processedStats
      })
    }
  }

  async op(msg: CommandoMessage, id: string, platform: Platform, operator: Operator | 'auto') {
    const rawStats = await this.getStats(id, platform)
    const check = this.errorCheck(rawStats, id, platform, msg)
    if (check) return check
    if (!enforceType<Stats>(rawStats)) return

    if (operator == 'auto') {
      const str = getMostPlayedOperator(rawStats, 'all').name
      if (!enforceType<Operator>(str)) return
      operator = str
    }

    const processedStats: OperatorEmbedStats = {}
    processedStats.pvp = rawStats.pvp.operators[operator] || undefined
    processedStats.pve = rawStats.pve.operators[operator] || undefined

    if (!processedStats.pvp && !processedStats.pve) return this.createEmbed({
      embedType: 'error',
      id,
      msg,
      platform,
      stats: 'No weapon stats have been found'
    })

    return this.createEmbed({
      embedType: 'op',
      id,
      msg,
      platform,
      stats: processedStats
    })
  }

  async types(msg: CommandoMessage, id: string, platform: Platform) {
    const rawStats = await this.getStats(id, platform)
    const check = this.errorCheck(rawStats, id, platform, msg)
    if (check) return check
    if (!enforceType<Stats>(rawStats)) return

    const processedStats = rawStats.pve.types

    return this.createEmbed({
      embedType: 'types',
      id,
      msg,
      platform,
      raw: rawStats,
      stats: processedStats
    })
  }

  async queue(msg: CommandoMessage, id: string, platform: Platform) {
    const rawStats = await this.getStats(id, platform)
    const check = this.errorCheck(rawStats, id, platform, msg)
    if (check) return check
    if (!enforceType<Stats>(rawStats)) return

    const processedStats = Object.values(rawStats.pvp.queue).sort((a, b) => b.matches - a.matches)

    return this.createEmbed({
      embedType: 'queue',
      id,
      msg,
      platform,
      raw: rawStats,
      stats: processedStats
    })
  }

  /** Use the udpated `username` and `platform` */
  async link(msg: CommandoMessage, username: string, platform: Platform) {
    const id = await this.getID(username, platform)
    if (!id) return this.createEmbed({
      embedType: 'error',
      id: username,
      msg,
      platform,
      stats: `${player(username, platform)} is not a valid player.`
    })

    const prev = this.checkDatabase(msg.message),
      prevStr = prev instanceof Array ? player(await this.getUsername(prev[0], prev[1]), prev[1]) : undefined,
      currStr = player(username, platform)

    const mode: 'same' | 'link' = prevStr == currStr ? 'same' : 'link'

    if (mode == 'link') this.store.set(msg.author.id, [id, platform])

    return this.createEmbed({
      embedType: 'link',
      id: username,
      msg,
      platform,
      stats: {
        previous: prevStr,
        current: currStr,
        mode
      }
    })
  }

  async unlink(msg: CommandoMessage) {
    const prev = this.checkDatabase(msg.message),
      prevStr = prev instanceof Array ? player(await this.getUsername(prev[0], prev[1]), prev[1]) : undefined

    if (prevStr) this.store.delete(msg.author.id)

    return this.createEmbed({
      embedType: 'unlink',
      id: undefined,
      msg,
      platform: undefined,
      stats: {
        previous: prevStr,
        mode: 'unlink'
      }
    })
  }
  // #endregion
}

export const ApiLoader = RainbowAPI
