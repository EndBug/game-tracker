import R6API, { Stats, Operator, OperatorStats, RankInfo, PvPMode, PvEMode, WeaponType, WeaponCategory, WeaponName } from 'r6api.js'; // eslint-disable-line no-unused-vars
import { Platform } from 'r6api.js'; // eslint-disable-line no-unused-vars
import { isWeaponName, isWeaponType } from 'r6api.js/ts-utils';
import { API, getShortName, ensureOne, mergeAndSum, readHours, readNumber, enforceType, camelToReadable, capitalize } from '../utils/utils';
import { RichEmbed, User } from 'discord.js'; // eslint-disable-line no-unused-vars
import { CommandoMessage } from 'discord.js-commando'; // eslint-disable-line no-unused-vars

const { UbisoftEmail, UbisoftPassword } = process.env;
const r6api = new R6API(UbisoftEmail, UbisoftPassword);

// #region Embeds
/** Ok, I know this is stupid, but it's kind of necessary */
type embedType_Type = 'general' | 'modes' | 'wp-single' | 'wp-cat'

/** Custom embed class that acts as base for other embeds */
class CustomEmbed extends RichEmbed {
  type: embedType_Type

  constructor(msg: CommandoMessage, ...args) {
    super(...args);
    return this.setTimestamp()
      .setAuthor('Rainbow 6 Siege Stats', 'https://i.imgur.com/RgoDkpy.png')
      .via(msg.author);
  }

  /** Adds the image of the most played operator to the embed
   * @param rawStats The raw stats object
   * @param type The playType to search the operator in
   */
  addOpImage(rawStats: Stats, type: playType) {
    let operators: Record<Operator, OperatorStats>;
    if (type == 'all') operators = mergeAndSum(rawStats.pve.operators, rawStats.pvp.operators);
    else operators = rawStats[type].operators;

    const mostUsedOp = Object.values(operators).sort((a, b) => -(a.playtime - b.playtime))[0];
    return this.setThumbnail(mostUsedOp.badge);
  }

  /** Adds a title to the embed */
  setHeader(str: string, username: string, platform: Platform) {
    return this.setTitle(str.trim() + ` stats for ${username} - ${platform.toUpperCase()}`);
  }

  /** Adds the name of the user that requested the data as in the footer */
  via(author: User) {
    return this.setFooter(`Requested by ${getShortName(author)}`, author.displayAvatarURL);
  }
}

/** Embed class for the 'general' command */
class GeneralEmbed extends CustomEmbed {
  type: 'general'

  constructor(msg: CommandoMessage, username: string, platform: Platform, playType: playType, stats: StatsType<'general'>, raw: Stats, ...args) {
    super(msg, ...args);
    this.type = 'general';
    return this.setHeader(`General ${playType == 'all' ? '' : readablePlayType(playType, true)}stats`, username, platform)
      .addOpImage(raw, playType)
      .addAccount(stats)
      .addMatches(stats)
      .addPerformance(stats);
  }

  /** Adds account stats to the embed */
  addAccount({ account }: GeneralStats) {
    const str = `Level: **${account.level}**
    XP: **${account.xp}**
    Current Rank: **${account.currentRank.tier == 'Unranked' ? '----' : account.currentRank.mmr} (${account.currentRank.tier})**
    Max Rank: **${account.maxRank.tier == 'Unranked' ? '----' : account.maxRank.mmr} (${account.maxRank.tier})**`;

    return this.addField('Account stats', str, false);
  }

  /** Adds matches stats to the embed */
  addMatches({ matches }: GeneralStats) {
    const { wins, losses, total } = matches;

    const str = `Total matches: **${readNumber(total)}**
    Total playtime: **${matches.playtime}**
    Wins/Losses: **${[wins, losses].map(n => readNumber(n)).join('** / **')}**
    Win rate: **${readNumber((wins / total) * 100)}%**`;

    return this.addField('Matches', str, true);
  }

  /** Adds performance stats to the embed */
  addPerformance({ performance }: GeneralStats) {
    const { kills, deaths, assists } = performance;

    const str = `K/D/A: **${[kills, deaths, assists].map(n => readNumber(n)).join('** / **')}**
    K/D ratio: **${readNumber(kills / deaths)}**
    DBNOs: **${readNumber(performance.dbnos)}**
    Revives: **${readNumber(performance.revives)}**`;

    return this.addField('Performance', str, true);
  }
}

/** Embed class for the 'modes' command */
class ModesEmbed extends CustomEmbed {
  type: 'modes'

  constructor(msg: CommandoMessage, username: string, platform: Platform, playType: strictPlayType, stats: StatsType<'modes'>, raw: Stats, ...args) {
    super(msg, ...args);
    this.type = 'modes';
    return this.setHeader(`${readablePlayType(playType)}`, username, platform)
      .addOpImage(raw, playType)
      .addModes(stats, playType);
  }

  addModes(stats: StatsType<'modes'>, playType: strictPlayType) {
    for (const modeKey in stats) this.addMode(stats[modeKey], modeKey, playType);
    return this;
  }

  addMode<T extends PvEMode | PvPMode>(mode: T, key: string, playType: strictPlayType) {
    let title: string,
      body = '';
    if (playType == 'pvp') {
      if (!enforceType<PvPMode>(mode)) return;
      title = mode.name;
    } else title = camelToReadable(key);

    for (const statKey in mode) {
      // @ts-ignore
      if (statKey != 'name') body += keyValue(statKey, mode[statKey]);
    }

    return this.addField(title, body.trim(), true);
  }
}

/** General class for bot 'wp-single' and 'wp-cat' embeds */
class WeaponEmbed extends CustomEmbed {
  addCategory(category: WeaponEmbedStats, title?: string) {
    const { CATname } = category;
    if (!title) title = `${capitalize(CATname)} category overall`;
    for (const playType in category) {
      if (!playType.includes('name')) {
        if (!enforceType<strictPlayType>(playType)) return;
        let str = '';
        for (const key in category[playType].general) str += keyValue(key, category[playType].general[key]);
        this.addField(title + ` (${playType})`, str, true);
      }
    }
    return this;
  }

  addWeapon(category: WeaponEmbedStats, wpName: WeaponName, title?: string, only?: strictPlayType) {
    if (!title) title = 'Weapon';
    for (const playType in category) {
      if (!playType.includes('name')) {
        if (only && playType != only) return;
        if (!enforceType<strictPlayType>(playType)) return;
        let str = '';
        const wp = category[playType].list.find(wp => wp.name == wpName);
        if (wp) for (const key in wp) {
          if (key != 'name') str += keyValue(key, wp[key]);
        }
        if (str) this.addField(title + ` (${playType})`, str, true);
      }
    }
    return this;
  }

  mostChosenWeapon(list: WeaponEmbedStats['pve']['list']) {
    return list.sort((a, b) => a.timesChosen - b.timesChosen)[0];
  }
}

/** Embed for the 'wp' command when triggered with a single weapon */
class WeaponSingleEmbed extends WeaponEmbed {
  type: 'wp-single'

  constructor(msg: CommandoMessage, username: string, platform: Platform, category: StatsType<'wp-single'>, ...args) {
    super(msg, ...args);
    this.type = 'wp-single';
    const weapon = category.WPname;
    return this.setHeader(weapon, username, platform)
      .addWeapon(category, weapon)
      .addCategory(category, `${capitalize(category.CATname)} category`);
  }
}

/** Embed for the 'wp' command when triggered with a category */
class WeaponCategoryEmbed extends WeaponEmbed {
  type: 'wp-cat'

  constructor(msg: CommandoMessage, username: string, platform: Platform, category: StatsType<'wp-cat'>, ...args) {
    super(msg, ...args);
    this.type = 'wp-cat';
    const wpPvP = this.mostChosenWeapon(category.pvp.list),
      wpPvE = this.mostChosenWeapon(category.pve.list);
    return this.setHeader(`${capitalize(category.CATname)} weapons`, username, platform)
      .addCategory(category, 'Category overall')
      .addWeapon(category, wpPvP.name, 'Most chosen weapon', 'pvp')
      .addWeapon(category, wpPvE.name, 'Most chosen weapon', 'pve');
  }
}
// #endregion

// #region Utility
type playType = 'all' | 'pvp' | 'pve'
type strictPlayType = Exclude<playType, 'all'>

function readablePlayType(str: strictPlayType, trailingSpace = false) {
  let res = str == 'pvp' ? 'PvP' : 'PvE';
  if (trailingSpace) res += ' ';
  return res;
}

/** You can store here all teh different expected kinds of processed stats to put in EmbedParameters */
type StatsType<T> =
  T extends 'general' ? GeneralStats :
  T extends 'modes' ? Stats['pvp']['mode'] | Stats['pve']['mode'] :
  T extends 'wp-single' | 'wp-cat' ? WeaponEmbedStats :
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
  return ['uplay', 'xbl', 'psn'].includes(str);
}

/**
 * Compares play regions to determine which is the most recent
 * @param regions The regions to compare
 */
function getLastPlayedRegion(regions: RankInfo['regions']) {
  const key = Object.values(regions).sort((a, b) => {
    const ad = new Date(a.updateTime),
      bd = new Date(b.updateTime);
    return -(ad.getTime() - bd.getTime()); // from the most recent to the oldest
  })[0].region;
  return regions[key];
}

function keyValue(key: string, value: number) {
  return `${camelToReadable(key)}: ${statFormat(value)}`;
}

function statFormat(value: number) {
  return `**${readNumber(value) || value}**`;
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
// #endregion

export class RainbowAPI extends API {
  constructor() {
    super('r6', 'Rainbow 6 Siege');
  }

  /** Function that chooses which type of embed to build and returns the chosen one */
  async createEmbed<T extends embedType_Type>({ id, embedType, msg, platform, playType, raw, stats }: EmbedParameters<T>) {
    const username = await this.getUsername(id, platform);
    let embed: CustomEmbed;

    // Type guards are necessary, jsut copy & paste them block-by-block
    if (embedType == 'general') {
      if (!enforceType<StatsType<'general'>>(stats)) return;
      embed = new GeneralEmbed(msg, username, platform, playType, stats, raw);
    } else if (embedType == 'modes') {
      if (!enforceType<StatsType<'modes'>>(stats)) return;
      if (playType == 'all') playType = 'pvp';
      embed = new ModesEmbed(msg, username, platform, playType, stats, raw);
    } else if (embedType == 'wp-single') {
      if (!enforceType<StatsType<'wp-single'>>(stats)) return;
      embed = new WeaponSingleEmbed(msg, username, platform, stats);
    } else if (embedType == 'wp-cat') {
      if (!enforceType<StatsType<'wp-cat'>>(stats)) return;
      embed = new WeaponCategoryEmbed(msg, username, platform, stats);
    }

    return embed;
  }

  // #region API wrappers
  async getLevel(id: string, platform: Platform) {
    return ensureOne(await r6api.getLevel(platform, id));
  }

  async getRank(id: string, platform: Platform) {
    return ensureOne(await r6api.getRank(platform, id));
  }

  async getUsername(id: string, platform: Platform) {
    return ensureOne(await r6api.getUsername(platform, id)).username;
  }

  /** Returns all the stats for a user */
  async getStats(id: string, platform: Platform) {
    return ensureOne(await r6api.getStats(platform, id));
  }
  // #endregion


  // #region Command methods
  async general(msg: CommandoMessage, id: string, platform: Platform, playType: playType) {
    let processedStats: GeneralStats;
    const rawStats = await this.getStats(id, platform);

    let finalStats: Stats['pvp']['general'] | Stats['pve']['general'];
    if (playType == 'all') finalStats = mergeAndSum(rawStats.pvp.general, rawStats.pve.general);
    else finalStats = rawStats[playType].general;

    const levelInfo = await this.getLevel(id, platform);
    const rankInfo = await this.getRank(id, platform);
    const region = getLastPlayedRegion(rankInfo.regions);

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
    };

    processedStats.matches = {
      losses: finalStats.losses,
      playtime: readHours(finalStats.playtime / 60 / 60),
      total: finalStats.matches,
      wins: finalStats.wins
    };

    processedStats.performance = {
      assists: finalStats.assists,
      dbnos: finalStats.dbno,
      deaths: finalStats.deaths,
      kills: finalStats.kills,
      revives: finalStats.revives
    };

    return this.createEmbed({
      id,
      embedType: 'general',
      msg,
      platform,
      playType,
      raw: rawStats,
      stats: processedStats
    });
  }

  async modes(msg: CommandoMessage, id: string, platform: Platform, playType: strictPlayType) {
    const rawStats = await this.getStats(id, platform);
    const processedStats = rawStats[playType].mode;

    return this.createEmbed({
      id,
      embedType: 'modes',
      msg,
      platform,
      playType,
      raw: rawStats,
      stats: processedStats
    });
  }

  async wp(msg: CommandoMessage, id: string, platform: Platform, wpOrCat: WeaponName | WeaponType) {
    const rawStats = await this.getStats(id, platform);
    var processedStats: WeaponEmbedStats;
    if (isWeaponName(wpOrCat)) {
      var CATname: WeaponType;
      for (const cat in rawStats.pvp.weapons) {
        if (enforceType<WeaponType>(cat) && rawStats.pvp.weapons[cat].list.some(wp => wp.name == wpOrCat))
          CATname = cat;
      }
      processedStats = {
        WPname: wpOrCat,
        CATname,
        pve: rawStats.pve.weapons[CATname],
        pvp: rawStats.pvp.weapons[CATname]
      };
      return this.createEmbed({
        embedType: 'wp-single',
        id,
        msg,
        platform,
        stats: processedStats
      });
    } else if (isWeaponType(wpOrCat)) {
      processedStats = {
        CATname: wpOrCat,
        pve: rawStats.pve.weapons[wpOrCat],
        pvp: rawStats.pvp.weapons[wpOrCat]
      };
      return this.createEmbed({
        embedType: 'wp-cat',
        id,
        msg,
        platform,
        stats: processedStats
      });
    }
  }
  // #endregion
}