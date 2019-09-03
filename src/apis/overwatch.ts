/* eslint-disable no-dupe-class-members */
import { User, GuildMember, RichEmbed } from 'discord.js';
import { CommandoMessage } from 'discord.js-commando'; // eslint-disable-line no-unused-vars
import * as owapi from 'overwatch-stats-api';

import { API } from '../core/app';
import { Cache, getShortName, readHours, readNumber, readMinutes, humanize, capitalize, equals, enforceType, stringToSeconds } from '../utils/utils';
import { heroName, SupportedHero, isSupported } from '../utils/ow_hero_names'; // eslint-disable-line no-unused-vars

type platform = 'pc' | 'xbl' | 'psn'
function isPlatform(value): value is platform {
  return ['pc', 'xbl', 'psn'].includes(value);
}
type embedType = 'quick' | 'comp' | 'hero' | 'herocomp' | 'link' | 'unlink' | 'warn' | 'error'

// Imgur album link: https://imgur.com/a/Ljsllvo
const img_links = {
  'ana': 'https://imgur.com/vtXTLNX.png',
  'ashe': 'https://imgur.com/6rChZQt.png',
  'baptiste': 'https://d1u1mce87gyfbn.cloudfront.net/hero/baptiste/hero-select-portrait.png',
  'bastion': 'https://imgur.com/IIJxgBC.png',
  'brigitte': 'https://imgur.com/vFi8alu.png',
  'doomfist': 'https://imgur.com/4tIcURJ.png',
  'dva': 'https://imgur.com/n0jfTlb.png',
  'genji': 'https://imgur.com/H08dQDo.png',
  'hanzo': 'https://imgur.com/6k5H1uT.png',
  'junkrat': 'https://imgur.com/v6y7aWZ.png',
  'lucio': 'https://imgur.com/zJZPKqA.png',
  'mccree': 'https://imgur.com/dH3vjO5.png',
  'mei': 'https://imgur.com/4cRvD4R.png',
  'mercy': 'https://imgur.com/dJYHnUe.png',
  'moira': 'https://imgur.com/l66IbCJ.png',
  'orisa': 'https://imgur.com/YPD9WxL.png',
  'pharah': 'https://imgur.com/ldLgKYw.png',
  'reaper': 'https://imgur.com/XvxlxG2.png',
  'reinhardt': 'https://imgur.com/DkZrniz.png',
  'roadhog': 'https://imgur.com/OgCpcOe.png',
  'soldier76': 'https://imgur.com/K5IpnT0.png',
  'sombra': 'https://imgur.com/aKkKZUg.png',
  'symmetra': 'https://imgur.com/SS9LWPZ.png',
  'torbjorn': 'https://imgur.com/XHoVgy9.png',
  'tracer': 'https://imgur.com/iQ6SPlB.png',
  'widowmaker': 'https://imgur.com/zFXCIpD.png',
  'winston': 'https://imgur.com/4CRA83D.png',
  'hammond': 'https://imgur.com/NpuqfRB.png',
  'zarya': 'https://imgur.com/lKgrayy.png',
  'zenyatta': 'https://imgur.com/yN2EJGI.png'
};

const cache = new Cache('Overwatch');

// #region Embeds
type StatsType<T> =
  T extends 'quick' | 'comp' ? RegularStats :
  T extends 'hero' | 'herocomp' ? HeroStats :
  undefined;

// #region Stat Interfaces

/** Interface for StatsEmbed options */
interface RegularStats {
  type: 'quickplay' | 'competitive'

  account: {
    avatar: string
    endorsement: number
    level: number
    rank?: {
      damage?: number
      support?: number
      tank?: number
    }
  }

  bestPerformance: {
    damage?: number
    healing?: number
    killStreak?: number
  }

  general: {
    wins: number
    losses?: number
    kdr: number
    minOnFire: number
  }

  mostPlayed: {
    name: string,
    hrsPlayed: number
  }[]
}

/** Interface for HeroEmbed options */
interface HeroStats {
  type: 'quickplay' | 'competitive'
  hero: string
  played: boolean
  currentlyRanked: boolean

  generic?: {
    deaths: number
    hrsPlayed: number
    kills: number
    wins: number
  }

  medals?: {
    bronze: number
    silver: number
    gold: number
  }

  specific?: Record<string, string>
}

// #endregion

type EmbedOptions<T> =
  T extends 'link' | 'unlink' ? LinkOptions<T> :
  T extends 'error' | 'warn' ? ErrorOptions<T> :
  StatsEmbedOptions<T>

interface StatsEmbedOptions<T> {
  battletag: string
  mode: T
  msg: CommandoMessage
  platform: platform
  stats: StatsType<T>
}

type playerEntry = [string, platform]
function isPlayerEntry(value): value is playerEntry {
  return value instanceof Array
    && value.length == 2
    && typeof value[0] == 'string'
    && isPlatform(value[1]);
}

interface LinkOptions<T> {
  mode: T
  msg: CommandoMessage
  previous: playerEntry
  current?: playerEntry
}

interface ErrorOptions<T> {
  error: string
  mode: T
  msg: CommandoMessage
}

/** Returns whether the supplied rank object has a valid score */
function checkRank(rank: RegularStats['account']['rank']) {
  return typeof rank == 'object' && Object.values(rank).reduce((prev = 0, curr) => curr ? prev + 1 : prev, 0) > 0;
}

/** Gets you a link to the PLayOverwatch website */
function getLink(battletag: string, platform: platform) {
  return `https://playoverwatch.com/en-us/career/${platform || 'pc'}/${battletag.replace('#', '-')}`;
}

/** Removes decimals from a number */
function noDec(number: number) {
  return readNumber(number, 0);
}

/** Returns a readable version of the target
 * @param bold Whether to make battletag and platform bold (true by default)
 */
function player(battletag: string, platform: platform, bold = true) {
  const b = bold ? '**' : '';
  return b + battletag + b + ' - ' + b + platform.toUpperCase() + b;
}

type EmbedSwitch<T> =
  T extends 'quick' | 'comp' ? StatsEmbed :
  T extends 'hero' | 'herocomp' ? HeroEmbed :
  T extends 'link' | 'unlink' ? LinkEmbed :
  T extends 'error' ? ErrorEmbed :
  T extends 'warn' ? WarnEmbed : CustomEmbed

class CustomEmbed extends RichEmbed {
  mode: embedType

  constructor(msg: CommandoMessage, ...args: any[]) {
    super(...args);
    this.setTimestamp(msg.createdAt)
      .setAuthor('Overwatch Stats', 'https://i.imgur.com/MaJToTw.png')
      .via(msg.author);
  }

  /** Adds the name of the user that requested the data as in the footer. */
  via(author: User) {
    return this.setFooter(`Requested by ${getShortName(author)}`, author.displayAvatarURL);
  }

  /** Adds the website link of the targeted profile to the embed description */
  private addLink(battletag: string, platform: platform) {
    return this.setDescription(`View this profile on the Overwatch [website](${getLink(battletag, platform)})`);
  }

  /** Adds a warning for non-currently-ranked players */
  notRanked() {
    this.description += '\n:warning: This account is not currently ranked: this data comes exclusively from off-season & placement matches.';
    return this;
  }

  /** Adds title and description to a embed
   * @param type The first word of the title, representing the type of the embed
   */
  setHeader(type: string, battletag: string, platform: platform) {
    return this.setTitle(`${capitalize(type)} stats for ${battletag.replace('-', '#')} - ${platform.toUpperCase()}`)
      .addLink(battletag, platform);
  }
}

class StatsEmbed extends CustomEmbed {
  mode: 'comp' | 'quick'

  constructor(msg: CommandoMessage, battletag: string, platform: platform, stats: RegularStats, ...args) {
    super(msg, ...args);

    this.mode = stats.type == 'competitive' ? 'comp' : 'quick';

    this.setHeader(stats.type, battletag, platform)
      .setColor('GREEN')
      .addAccount(stats)
      .addMostPlayed(stats)
      .addGeneral(stats)
      .addBestPerformance(stats);

    if (this.mode == 'comp' && !checkRank(stats.account.rank)) this.notRanked();
  }

  /** Adds account data to the embed */
  addAccount({ account }: RegularStats) {
    let rankStr: string;
    if (checkRank(account.rank)) {
      const { rank } = account;
      const arr: [string, number][] = [];
      // 💣 Damage | ⛑️ Support | 🛡️ Tank
      if (rank.damage) arr.push(['💣', rank.damage]);
      if (rank.support) arr.push(['⛑️', rank.support]);
      if (rank.tank) arr.push(['🛡️', rank.tank]);

      rankStr = `Rank (${arr.map(i => i[0]).join('|')}): ${arr.map(i => `**${i[1] || '----'}**`).join(' | ')}`;
    } else rankStr = 'Rank: **----**';

    this.addField('Account stats', `Level: **${account.level}**
    Endorsement: **${account.endorsement}**
    ${rankStr}`, true)
      .setThumbnail(account.avatar);
    return this;
  }

  /** Adds most played heroes to the embed */
  addMostPlayed({ mostPlayed }: RegularStats) {
    let text = '';
    for (const { name, hrsPlayed } of mostPlayed) text += `\n${name}: **${readHours(hrsPlayed)}**`;
    this.addField('Most played heroes', text.trim(), true);
    return this;
  }

  /** Adds general info to the embed */
  addGeneral({ general }: RegularStats) {
    const { wins, losses } = general;
    let win: string;

    if (!losses) win = `Games won: **${wins}**`;
    else win = `Win rate: **${noDec(wins / losses)}%** (${wins}/${losses})`;
    this.addField('General', `
    Kills/deaths: **${readNumber(general.kdr)}**
    ${win}
    Longest on fire: **${readMinutes(general.minOnFire)}**`, true);

    return this;
  }

  /** Adds record stats to the embed */
  addBestPerformance({ bestPerformance }: RegularStats) {
    this.addField('Performance', `
    Highest damage: **${noDec(bestPerformance.damage) || '----'}**
    Highest healing: **${noDec(bestPerformance.healing) || '----'}**
    Best kill streak: **${noDec(bestPerformance.killStreak) || '----'}**`, true);
    return this;
  }
}

class HeroEmbed extends CustomEmbed {
  mode: 'herocomp' | 'hero'

  constructor(msg: CommandoMessage, battletag: string, platform: platform, stats: HeroStats, ...args) {
    super(msg, ...args);

    this.mode = stats.type == 'competitive' ? 'herocomp' : 'hero';

    this.setHeader(stats.type + ' ' + heroName(stats.hero), battletag, platform)
      .setColor('GREEN')
      .addImage(stats);

    !stats.played ? this.setDescription('You haven\'t played this hero in this mode yet :confused:').setColor('GOLD')
      : this.addHeroData(stats)
        .addGeneric(stats)
        .addMedals(stats);

    if (stats.type == 'competitive' && !stats.currentlyRanked) this.notRanked();
  }

  /** Sets the thumbanail with the image of the hero */
  addImage({ hero }: HeroStats) {
    return this.setThumbnail(img_links[hero]);
  }

  /** Adds a field with hero-specific stats */
  addHeroData({ specific }: HeroStats) {
    let str = '';
    for (const key in specific)
      str += `${humanize(key).replace('avg per 10 min', '(avg 10m)')}: **${specific[key]}**\n`;
    return this.addField('Hero statistics', str);
  }


  /** Adds a field with generic stats */
  addGeneric({ generic }: HeroStats) {
    const { kills, deaths } = generic;

    return this.addField('General stats', `
    Time played: **${readHours(generic.hrsPlayed)}**
    Kills/deaths: **${readNumber(kills / deaths)}** (**${[kills, deaths].map(noDec).join('**/**')}**)
    Games won: **${noDec(generic.wins)}**`, true);
  }


  /** Adds a field with medal stats */
  addMedals({ medals }: HeroStats) {
    const { bronze, silver, gold } = medals;

    return this.addField('Medals', `
    Gold: **${gold}**
    Silver: **${silver}**
    Bronze: **${bronze}**`, true);
  }
}

class LinkEmbed extends CustomEmbed {
  mode: 'link' | 'unlink'

  constructor({ mode, msg, previous, current }: LinkOptions<'link' | 'unlink'>, ...args) {
    super(msg, ...args);
    this.mode = mode;
    if (equals(previous, current)) this.same(current);
    else this[mode](previous, current);
  }

  /** Changes the color, adds title and description to the embed
   * @param prev The previous [battletag, platform]
   * @param curr The current [battletag, platform]
   */
  link(prev: [string, platform], curr: [string, platform]) {
    return this.setColor([0, 154, 228])
      .setTitle(`Blizzard profile ${prev ? 'updated' : 'linked'}`)
      .setD(`Your profile is now linked: ${player(curr[0], curr[1])}`, prev);
  }

  /** Adds title and descirption to the embed
   * @param prev The previous [battletag, platform]
   */
  unlink(prev: [string, platform]) {
    return this.setTitle('Blizzard profile unlinked')
      .setD(undefined, prev);
  }

  /** Changes the color, adds title and description to the embed
   * @param curr The current [battletag, platform]
   */
  same(curr: [string, platform]) {
    return this.setColor([0, 154, 228])
      .setTitle('Blizzard profile unchanged')
      .setDescription(`Your linked profile is ${player(curr[0], curr[1])}`);
  }

  /** Adds a custom description
   * @param desc The first part of the description
   * @param prev The previous [battletag, platform]
   */
  private setD(desc = '', prev: [string, platform]) {
    return this.setDescription(desc + (prev ? `\nYour previous linked profile was ${player(prev[0], prev[1])}.` : '\nYou had no previous linked profile.'));
  }
}

class WarnEmbed extends CustomEmbed {
  mode: 'warn'

  constructor(msg: CommandoMessage, error: string, ...args: any[]) {
    super(msg, ...args);
    this.mode = 'warn';
    return this.setColor('GOLD')
      .setTitle('Sorry...')
      .setDescription(error);
  }
}

class ErrorEmbed extends CustomEmbed {
  mode: 'error'

  constructor(msg: CommandoMessage, error: string, ...args: any[]) {
    super(msg, ...args);
    this.mode = 'error';
    return this.setColor('RED')
      .setTitle('I got an error from the server')
      .setDescription(error);
  }
}


// #endregion

export class OverwatchAPI extends API {
  constructor() {
    super('ow', 'Overwatch');
  }

  /** Returns the stored data about a user.
   * @param id The user, guild member or id of the user
   * @param reverse Whether to return keys (default is false)
   */
  checkDatabase(id: string | User | GuildMember, reverse = false) {
    if (id instanceof User || id instanceof GuildMember) id = id.id;
    return !reverse ? this.store.get(id) : this.store.getKey(id.replace('#', '-'));
  }

  private createEmbed<T extends embedType>(options: EmbedOptions<T>): EmbedSwitch<T> {
    let embed: CustomEmbed;
    const { mode } = options;

    if (['quick', 'comp'].includes(mode)) {
      if (!enforceType<EmbedOptions<'quick' | 'comp'>>(options)) return;
      const { battletag, msg, platform, stats } = options;
      embed = new StatsEmbed(msg, battletag, platform, stats);
    } else if (['hero', 'herocomp'].includes(mode)) {
      if (!enforceType<EmbedOptions<'hero' | 'herocomp'>>(options)) return;
      const { battletag, msg, platform, stats } = options;
      embed = new HeroEmbed(msg, battletag, platform, stats);
    } else if (['link', 'unlink'].includes(mode)) {
      if (!enforceType<EmbedOptions<'link' | 'unlink'>>(options)) return;
      embed = new LinkEmbed(options);
    } else if (mode == 'warn') {
      if (!enforceType<EmbedOptions<'warn'>>(options)) return;
      const { error, msg } = options;
      embed = new WarnEmbed(msg, error);
    } else if (mode == 'error') {
      if (!enforceType<EmbedOptions<'error'>>(options)) return;
      const { error, msg } = options;
      embed = new ErrorEmbed(msg, error);
    }

    // @ts-ignore
    return embed;
  }

  /** Fecthes data about the target from the API */
  async getStats(battletag: string, platform: platform): Promise<owapi.AllStats> {
    battletag = battletag.replace('#', '-');

    const cached = cache.get(battletag + platform);
    if (cached) return cached;

    let stats: owapi.AllStats, error: Error;
    try {
      stats = await owapi.getAllStats(battletag, platform);
    } catch (e) {
      error = e instanceof Error ? e
        : typeof e == 'string' ? new Error(e)
          : undefined;
    }

    if (stats) {
      cache.add(battletag + platform, stats);
      return stats;
    } else if (error instanceof Error) throw error;
  }

  /** Converts a getStats rejection into a error/warn embed */
  buildRejection(error: Error, msg: CommandoMessage, action: Exclude<embedType, 'error' | 'warn'>, battletag: string, platform: platform) {
    const actionDict: Record<Exclude<embedType, 'error' | 'warn'>, string> = {
      quick: 'quickplay stats',
      comp: 'competitive stats',
      hero: 'quicplay hero stats',
      herocomp: 'competitive hero stats',
      link: 'to link',
      unlink: 'to unlink'
    };
    const errorBase = `\nYou requested ${actionDict[action]} for ${player(battletag, platform)}`;

    if (error.message == 'PROFILE_PRIVATE') return this.createEmbed({
      mode: 'warn',
      error: 'This profile is private.',
      msg
    });
    return this.createEmbed({
      mode: 'error',
      error: (error.message == 'PROFILE_NOT_FOUND' ? 'Profile not found.' : '```\n' + error.message + '\n```') + errorBase,
      msg
    });
  }

  // #region Command methods

  private formatRank(rank: owapi.Rank): RegularStats['account']['rank'] {
    if (typeof rank != 'object') return;
    return Object.entries(rank).map(([key, value]) => {
      if (!enforceType<owapi.RankRole>(value)) return;
      const srOnly = parseInt(value.sr);
      return [key, srOnly];
    }).reduce((accum, [k, v]) => {
      accum[k] = v;
      return accum;
    }, {});
  }

  /** Returns the account for comp/quick stats */
  private regularAccount(stats: owapi.AllStats) {
    const account: RegularStats['account'] = {
      avatar: stats.iconURL,
      endorsement: parseInt(stats.endorsementLevel) || 0,
      level: stats.prestige * 100 + parseInt(stats.level) || 0,
      rank: this.formatRank(stats.rank) || {}
    };

    return account;
  }

  async quick(battletag: string, platform: platform, msg: CommandoMessage) {
    const stats = await this.getStats(battletag, platform).catch(e => this.buildRejection(e, msg, 'quick', battletag, platform));
    if (stats instanceof CustomEmbed) return stats;

    const { best, combat } = stats.heroStats.quickplay.overall,
      mpStat = stats.mostPlayed.quickplay;

    const mostPlayed: RegularStats['mostPlayed'] = [];

    for (const hero in mpStat) {
      const time = stringToSeconds(mpStat[hero].time) / 60 / 60;
      mostPlayed.push({
        name: heroName(hero),
        hrsPlayed: time
      });
      if (mostPlayed.length >= 3) break;
    }

    const res: RegularStats = {
      type: 'quickplay',
      account: this.regularAccount(stats),
      bestPerformance: {
        damage: parseInt(best.all_damage_done_most_in_game) || 0,
        healing: parseInt(best.hero_damage_done_most_in_game) || 0,
        killStreak: parseInt(best.kill_streak_best) || 0
      },
      general: {
        kdr: parseInt(combat.eliminations) / parseInt(combat.deaths) || 0.00,
        minOnFire: stringToSeconds(combat.time_spent_on_fire) / 60 || 0,
        wins: parseInt(stats.heroStats.quickplay.overall.game.games_won) || 0
      },
      mostPlayed
    };

    return this.createEmbed({
      mode: 'quick',
      battletag,
      msg,
      platform,
      stats: res
    });
  }

  async comp(battletag: string, platform: platform, msg: CommandoMessage) {
    const stats = await this.getStats(battletag, platform).catch(e => this.buildRejection(e, msg, 'comp', battletag, platform));
    if (stats instanceof CustomEmbed) return stats;

    const { best, combat } = stats.heroStats.competitive.overall,
      mpStat = stats.mostPlayed.competitive;

    const mostPlayed: RegularStats['mostPlayed'] = [];

    for (const hero in mpStat) {
      const time = stringToSeconds(mpStat[hero].time) / 60 / 60;
      mostPlayed.push({
        name: heroName(hero),
        hrsPlayed: time
      });
      if (mostPlayed.length >= 3) break;
    }

    const res: RegularStats = {
      type: 'competitive',
      account: this.regularAccount(stats),
      bestPerformance: {
        damage: parseInt(best.all_damage_done_most_in_game) || 0,
        healing: parseInt(best.hero_damage_done_most_in_game) || 0,
        killStreak: parseInt(best.kill_streak_best) || 0
      },
      general: {
        kdr: parseInt(combat.eliminations) / parseInt(combat.deaths) || 0.00,
        minOnFire: stringToSeconds(combat.time_spent_on_fire) / 60 || 0,
        wins: parseInt(stats.heroStats.competitive.overall.game.games_won) || 0
      },
      mostPlayed
    };

    return this.createEmbed({
      mode: 'comp',
      battletag,
      msg,
      platform,
      stats: res
    });
  }

  async hero(battletag: string, platform: platform, msg: CommandoMessage, hero: SupportedHero | 'auto') {
    const stats = await this.getStats(battletag, platform).catch(e => this.buildRejection(e, msg, 'hero', battletag, platform));
    if (stats instanceof CustomEmbed) return stats;

    if (hero == 'auto') {
      const heroPool = Object.keys(stats.mostPlayed.quickplay);
      let mostPlayedIndex = 0;
      do {
        // @ts-ignore
        hero = heroPool[mostPlayedIndex];
        mostPlayedIndex++;
      } while (!isSupported(hero) && mostPlayedIndex < heroPool.length);
    } else if (!isSupported(hero)) throw new Error('Unsupported hero provided.');
    if (!isSupported(hero)) return this.createEmbed({
      mode: 'warn',
      error: 'You haven\'t played any hero yet :confused:',
      msg
    });

    const heroNode = stats.heroStats.quickplay[hero];

    const res: HeroStats = {
      type: 'quickplay',
      hero,
      currentlyRanked: checkRank(this.formatRank(stats.rank)),
      played: !!stats.mostPlayed.quickplay[hero]
    };

    if (res.played) {
      res.generic = {
        deaths: parseInt(heroNode.combat.deaths) || 0,
        hrsPlayed: stringToSeconds(heroNode.game.time_played) / 60 / 60 || 0,
        kills: parseInt(heroNode.combat.eliminations) || 0,
        wins: parseInt(heroNode.game.games_won) || 0
      };
      res.medals = {
        bronze: parseInt(heroNode.match_awards.medals_bronze) || 0,
        silver: parseInt(heroNode.match_awards.medals_silver) || 0,
        gold: parseInt(heroNode.match_awards.medals_gold) || 0
      };
      res.specific = heroNode.hero_specific;
    }

    return this.createEmbed({
      mode: 'hero',
      battletag,
      msg,
      platform,
      stats: res
    });
  }

  async herocomp(battletag: string, platform: platform, msg: CommandoMessage, hero: SupportedHero | 'auto') {
    const stats = await this.getStats(battletag, platform).catch(e => this.buildRejection(e, msg, 'herocomp', battletag, platform));
    if (stats instanceof CustomEmbed) return stats;

    if (hero == 'auto') {
      const heroPool = Object.keys(stats.mostPlayed.competitive);
      let mostPlayedIndex = 0;
      do {
        // @ts-ignore
        hero = heroPool[mostPlayedIndex];
        mostPlayedIndex++;
      } while (!isSupported(hero) && mostPlayedIndex < heroPool.length);
    } else if (!isSupported(hero)) throw new Error('Unsupported hero provided.');
    if (!isSupported(hero)) return this.createEmbed({
      mode: 'warn',
      error: 'You haven\'t played any hero yet :confused:',
      msg
    });

    const heroNode = stats.heroStats.competitive[hero];

    const res: HeroStats = {
      type: 'competitive',
      hero,
      currentlyRanked: checkRank(this.formatRank(stats.rank)),
      played: !!stats.mostPlayed.competitive[hero]
    };

    if (res.played) {
      res.generic = {
        deaths: parseInt(heroNode.combat.deaths) || 0,
        hrsPlayed: stringToSeconds(heroNode.game.time_played) / 60 / 60 || 0,
        kills: parseInt(heroNode.combat.eliminations) || 0,
        wins: parseInt(heroNode.game.games_won) || 0
      };
      res.medals = {
        bronze: parseInt(heroNode.match_awards.medals_bronze) || 0,
        silver: parseInt(heroNode.match_awards.medals_silver) || 0,
        gold: parseInt(heroNode.match_awards.medals_gold) || 0
      };
      res.specific = heroNode.hero_specific;
    }

    return this.createEmbed({
      mode: 'herocomp',
      battletag,
      msg,
      platform,
      stats: res
    });
  }

  async link(battletag: string, platform: platform, msg: CommandoMessage) {
    const stats = await this.getStats(battletag, platform).catch(e => this.buildRejection(e, msg, 'link', battletag, platform));
    if (stats instanceof CustomEmbed) return stats;

    const prev = this.checkDatabase(msg.author),
      next: playerEntry = [battletag, platform];

    if (!isPlayerEntry(prev) || !equals(prev, next)) this.store.set(msg.author.id, next);

    return this.createEmbed({
      mode: 'link',
      current: next,
      msg,
      previous: isPlayerEntry(prev) ? prev : undefined
    });
  }

  async unlink(battletag: string, platform: platform, msg: CommandoMessage) {
    const prev = this.checkDatabase(msg.author);

    if (prev) this.store.delete(msg.author.id);

    return this.createEmbed({
      mode: 'unlink',
      msg,
      previous: isPlayerEntry(prev) ? prev : undefined
    });
  }
  // #endregion
}

export const ApiLoader = OverwatchAPI;