import R6API, { Stats, Operator, OperatorStats, RankInfo, PvPMode, PvEMode } from 'r6api.js'; // eslint-disable-line no-unused-vars
import { Platform } from 'r6api.js'; // eslint-disable-line no-unused-vars
import { API, getShortName, ensureOne, mergeAndSum, readHours, readNumber, enforceType, camelToReadable } from '../utils/utils';
import { RichEmbed, User } from 'discord.js'; // eslint-disable-line no-unused-vars
import { CommandoMessage } from 'discord.js-commando'; // eslint-disable-line no-unused-vars

const { UbisoftEmail, UbisoftPassword } = process.env;
const r6api = new R6API(UbisoftEmail, UbisoftPassword);

//#region Embeds
/** Ok, I know this is stupid, but it's kind of necessary */
type embedType_Type = 'general' | 'modes'

/** Custom embed class that acts as base for other embeds */
class CustomEmbed extends RichEmbed {
  type: embedType_Type

  constructor(msg: CommandoMessage, ...args) {
    super(...args);
    return this.setTimestamp()
      .setAuthor('Rainbow 6 Siege Stats', 'https://i.imgur.com/RgoDkpy.png')
      .via(msg.author);
  }

  /**
   * Adds the image of the most played operator to the embed
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

  /**
   * Adds the name of the user that requested the data as in the footer
   * @param author
   */
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
    return this.setTitle(`General ${playType == 'all' ? '' : readablePlayType(playType, true)}stats for ${username} - ${platform.toUpperCase()}`)
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
    return this.setTitle(`${readablePlayType(playType)} stats for ${username} - ${platform.toUpperCase()}`)
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
      //@ts-ignore
      if (statKey != 'name') body += `${camelToReadable(statKey)}: **${readNumber(mode[statKey]) || mode[statKey]}**\n`;
    }

    return this.addField(title, body.trim(), true);
  }
}
//#endregion

//#region Utility
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
    return -(ad.getTime() - bd.getTime()); //from the most recent to the oldest
  })[0].region;
  return regions[key];
}
//#endregion

//#region Processed stats formats
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
//#endregion

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
    }

    return embed;
  }

  //#region API wrappers
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
  //#endregion


  //#region Command methods
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
  //#endregion
}