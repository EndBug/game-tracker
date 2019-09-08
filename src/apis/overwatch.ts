import { getHeroStats, HeroStats } from 'overwatch-stats-api'; // eslint-disable-line no-unused-vars

import { API } from '../utils/utils';
import { OWAPIBlob, Region, ErrorResponse } from '../types/owapi'; // eslint-disable-line no-unused-vars
import { CommandoMessage } from 'discord.js-commando'; // eslint-disable-line no-unused-vars
import { User, GuildMember, RichEmbed } from 'discord.js';
import { getShortName, capitalize, readHours, readMinutes, readNumber, equals, humanize, Cache } from '../utils/utils';

const requestNative = require('request-promise');
async function request(...args: any[]) {
  var res = await requestNative(...args);
  if (res.name == 'StatusCodeError') return res.error;
  else return res;
}

const local_api_link_URL = '127.0.0.1:4444';

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
  'wrecking_ball': 'https://imgur.com/NpuqfRB.png',
  'zarya': 'https://imgur.com/lKgrayy.png',
  'zenyatta': 'https://imgur.com/yN2EJGI.png'
};

//#region Local API checks & vars

/**
 * Either `'owapi.net'` or `'127.0.0.1:4444'`
 */
var APIHost: string;
/**
 * Checks whether there is a local instance of OWAPI running in localhost.
 * Retuns the resulting host domain (and port)
 */
async function checkLocalAPI() {
  interface RequestError {
    cause: Error
    error: Error
    message: string
    name: 'RequestError'
    options: {
      callback: Function
      resolveWithFullResponse: boolean
      simple: boolean
      transform
      transform2xxOnly: boolean
      uri: string
    }
  }

  try {
    const res: Error | RequestError = await request({
      uri: `http://${local_api_link_URL}/api/v3/u/EndBug-2119/blob`,
      headers: {
        'User-Agent': 'request'
      },
      json: true
    });
    APIHost = (res instanceof Error || res.error) ? 'owapi.net' : local_api_link_URL;
    return APIHost;
  } catch {
    APIHost = 'owapi.net';
    return APIHost;
  }
}

//#endregion

var cache = new Cache('Overwacth');

/* #region Embeds */

/**
 * Return the profile link for the given query parameters.
 * @param battletag 
 * @param platform 
 */
function getLink(battletag: string, platform: string) {
  return `https://playoverwatch.com/en-us/career/${platform || 'pc'}/${battletag.replace('#', '-')}`;
}

class CustomEmbed extends RichEmbed {
  type: string
  data: Region
  mode: string

  constructor(msg: CommandoMessage, ...args: any[]) {
    super(...args);
    return this.setTimestamp()
      .setAuthor('Overwatch Stats', 'https://i.imgur.com/MaJToTw.png')
      .via(msg.author);
  }

  /**
   * Adds the name of the user that requested the data as in the footer.
   * @param author
   */
  via(author: User) {
    return this.setFooter(`Requested by ${getShortName(author)}`, author.displayAvatarURL);
  }

  /**
   * Adds the website link of the targeted profile to the mebed description
   * @param battletag 
   * @param platform 
   */
  addLink(battletag: string, platform: string) {
    return this.setDescription(`View this profile on the Overwatch [website](${getLink(battletag, platform)})`);
  }
}

class StatsEmbed extends CustomEmbed {
  constructor(data: Region, mode: string, msg: CommandoMessage, ...args: any[]) {
    super(msg, ...args);
    this.type = 'stats';
    this.data = data;
    this.mode = mode;
    this.setColor('GREEN');
    this.addAccount()
      .addMostPlayed()
      .addGeneral()
      .addBestPerformance();
  }

  /**
   * Adds account data to the embed
   */
  addAccount() {
    const data = this.data.stats.quickplay.overall_stats;
    this.addField('Account stats', `Level: **${data.prestige * 100 + data.level}**
    Endorsement: **${data.endorsement_level}**
    Rank: **${data.comprank ? data.comprank : '----'}**`, true)
      .setThumbnail(data.avatar);
    return this;
  }

  /**
   * Adds most played heroes to the embed
   */
  addMostPlayed() {
    const data = this.data.heroes.playtime[this.mode];
    const best_heroes = getBestKeys(3, data);
    let text = '';
    for (const hero of best_heroes) text += `\n${heroName(hero)}: **${readHours(data[hero])}**`;
    this.addField('Most played heroes', text.trim(), true);
    return this;
  }

  /**
   * Adds general info to the embed
   */
  addGeneral() {
    const mode_data = this.data.stats[this.mode],
      data = mode_data.game_stats,
      overall = mode_data.overall_stats;
    let win: string;

    if (this.mode == 'quickplay') win = `Games won: **${overall.wins}**`;
    else win = `Win rate: **${statNum(overall.win_rate)}%** (${overall.wins}/${overall.losses})`;
    this.addField('General', `
    Kills/deaths: **${data.kpd}**
    ${win}
    Longest on fire: **${readMinutes(data.time_spent_on_fire_most_in_game * 60)}**`, true);
    return this;
  }

  /**
   * Adds record stats to the embed
   */
  addBestPerformance() {
    const data = this.data.stats[this.mode].game_stats;
    this.addField('Performance', `
    Highest damage: **${statNum(data.hero_damage_done_most_in_game)}**
    Highest healing: **${statNum(data.healing_done_most_in_game)}**
    Best kill streak: **${statNum(data.kill_streak_best)}**`, true);
    return this;
  }
}

class LinkEmbed extends CustomEmbed {
  constructor(mode: string, previous: string[], current: string[], msg: CommandoMessage, ...args) {
    super(msg, ...args);
    this.type = mode;
    if (equals(previous, current)) mode = 'same';
    this[mode](current, previous);
  }

  /**
   * Changes the color, adds title and description to the embed
   * @param curr The current [battletag, profile]
   * @param prev The previous [battletag, profile]
   */
  link(curr: string[], prev: string[]) {
    return this.setColor([0, 154, 228])
      .setTitle(`Blizzard profile ${prev ? 'updated' : 'linked'}`)
      .setD(`Your profile is now linked: ${player(curr[0], curr[1])}`, prev);
  }

  /**
   * Adds title and descirption to the embed
   * @param curr Unnecessary parameter, keep it `undefined`
   * @param prev The previous [battletag, profile]
   */
  // @ts-ignore
  unlink(curr?: string[], prev: string[]) {
    return this.setTitle('Blizzard profile unlinked')
      .setD(undefined, prev);
  }

  /**
   * Changes the color, adds title and description to the embed
   * @param curr The current [battletag, profile]
   */
  same(curr: string[]) {
    return this.setColor([0, 154, 228])
      .setTitle('Blizzard profile unchanged')
      .setDescription(`Your linked profile is ${player(curr[0], curr[1])}`);
  }

  /**
   * Adds a custom description
   * @param desc The first part of the description
   * @param prev The previous [battletag, profile]
   */
  private setD(desc = '', prev: string[]) {
    return this.setDescription(desc + (prev ? `\nYour previous linked profile was ${player(prev[0], prev[1])}.` : '\nYou had no previous linked profile.'));
  }
}

class HeroEmbed extends CustomEmbed {
  hero: string
  extra: HeroStats

  constructor(data: Region, mode: string, hero: string, extra: HeroStats, msg: CommandoMessage, ...args) {
    super(msg, ...args);
    this.type = 'hero';
    this.data = data;
    this.mode = mode.split(' ')[0];
    this.hero = hero == 'auto' ? getBestKeys(1, data.heroes.playtime[this.mode])[0] : hero;
    this.extra = extra;

    this.setColor('GREEN')
      .addImage();

    if (this.checkPlaytime())
      this.addHeroData()
        .addGeneric()
        .addMedals();
    else this.setDescription('You haven\'t played this hero in this mode yet :confused:');
  }

  /**
   * Sets the thumbanail with the image of the hero
   */
  addImage() {
    return this.setThumbnail(img_links[this.hero]);
  }

  /**
   * Adds a field with hero-specific stats
   */
  addHeroData() {
    // TODO: check from issue whether hero-specific stats are still a thing -> https://github.com/Fuyukai/OWAPI/issues/282
    // const herodata: Region['heroes']['stats']['competitive']['ana'] = this.data.heroes.stats[this.mode][this.hero].hero_stats;
    //return this.addField('Hero statistics', '*To do: check if API still works.*');
    const data: object = this.extra[this.mode][this.hero == 'wrecking_ball' ? 'hammond' : this.hero].hero_specific;
    let str = '';
    for (const key in data) {
      str += `${humanize(key).replace('avg per 10 min', '(avg 10m)')}: **${data[key]}**\n`;
    }
    return this.addField('Hero statistics', str);
  }


  /**
   * Adds a field with generic stats
   */
  addGeneric() {
    const stats = this.data.heroes.stats[this.mode][this.hero].general_stats;
    return this.addField('General stats', `
    Time played: **${readHours(stats.time_played)}**
    Kills/deaths: **${readNumber(stats.eliminations / stats.deaths, 2)}** (${statNum(stats.eliminations)}/${statNum(stats.deaths)})
    Games won: **${statNum(stats.games_won)}**`, true);
  }


  /**
   * Adds a field with medal stats
   */
  addMedals() {
    const stats = this.data.heroes.stats[this.mode][this.hero].general_stats;
    const [gold, silver, bronze] = [stats.medals_gold, stats.medals_silver, stats.medals_bronze];
    return this.addField('Medals', `
    Gold: **${gold ? statNum(gold) : 0}**
    Silver: **${silver ? statNum(silver) : 0}**
    Bronze: **${bronze ? statNum(bronze) : 0}**`, true);
  }

  /**
   * Checks whether the hero has been played at least one time
   */
  checkPlaytime() {
    return !!this.data.heroes.stats[this.mode][this.hero];
  }
}

class ErrorEmbed extends CustomEmbed {
  constructor(error: string, msg: CommandoMessage, ...args: any[]) {
    super(msg, ...args);
    this.type = 'error';
    return this.setColor('RED')
      .setTitle('I got an error from the server')
      .setDescription(error);
  }
}

class WarnEmbed extends CustomEmbed {
  constructor(error: string, msg: CommandoMessage, ...args: any[]) {
    super(msg, ...args);
    this.type = 'warn';
    return this.setColor('GOLD')
      .setTitle('Sorry...')
      .setDescription(error);
  }
}

class DownEmbed extends CustomEmbed {
  constructor(link: string, msg: CommandoMessage, ...args: any[]) {
    super(msg, ...args);
    this.type = 'down';
    return this.setColor('GOLD')
      .setTitle('API down')
      .setDescription(`Blizzard seems to have a problem with its API that prevents the bot from getting your data :confused:
      Please try later; if you want to check the website yourself in the meantime, you can visit [this link](${link}).
      If you think there's an error, please report it to the bot owner.`);
  }
}

interface EmbedParams {
  battletag: string,
  data?: Region,
  platform: string,
  hero?: string,
  mode: string,
  extra?: HeroStats
  msg: CommandoMessage,
  error?: string
}
/**
 * Creates a custom embed with the given options
 * @param options An object that contains the options
 * @param options.battletag
 * @param options.data The data, unless `options.mode` is 'error' or 'warn'
 * @param options.platform
 * @param options.hero The hero, if `options.mode` ends with 'hero'
 * @param options.mode 
 * @param options.extra Extra data needed for some modes (e.g. data from other APIs)
 * @param options.msg The message that triggered the command
 * @param options.error The error, if `options.mode` is 'error' or 'warn'
 * 
 */
function createEmbed({ battletag, data, platform, hero, mode, extra, msg, error }: EmbedParams) {
  let embed: CustomEmbed;

  if (error) {
    if (mode == 'error') embed = new ErrorEmbed(error, msg);
    else if (mode == 'warn') embed = new WarnEmbed(error, msg);
    else if (mode == 'down') embed = new DownEmbed(getLink(battletag, platform), msg);
  } else if (['link', 'unlink'].includes(mode)) {
    // @ts-ignore
    embed = new LinkEmbed(mode, data, [battletag, platform], msg);
  } else if (mode.endsWith('hero')) {
    embed = new HeroEmbed(data, mode, hero, extra, msg);
    // @ts-ignore
    embed.setTitle(`${capitalize(mode.split(' ')[0])} ${heroName(embed.hero)} stats for ${player(battletag, platform, false)}`);
  } else {
    embed = new StatsEmbed(data, mode, msg)
      .setTitle(`${capitalize(mode)} stats for ${player(battletag, platform, false)}`);

    if (mode == 'competitive' && !data.stats.competitive.overall_stats.comprank)
      embed.description += '\n:warning: This account is not currently ranked: this data comes exclusively from off-season & placement matches.';

    if (['hero', 'stats'].includes(embed.type)) embed.addLink(battletag, platform);
  }

  return embed;
}

/* #endregion */

// #region Error checking
interface StatusCodeError {
  error: ErrorResponse
}
function isStatusCE(item: any): item is StatusCodeError {
  return !!item.error;
}
/**
 * Checks whether the data returned from OverwatchAPI.getRaw() is an error
 * @param data The data to check
 * @param query An array with mode, battletag and platform of the query
 * @param msg The message that trigegred the command
 * @todo Check return type
 */
function errorCheck(data: Region | Error | StatusCodeError, [mode, battletag, platform]: string[], msg: CommandoMessage) {
  if (isStatusCE(data)) {
    const obj = data.error;
    let error: string,
      embedMode: string;
    if (obj.error == 404) {
      error = '`404` - Profile not found.';
      embedMode = 'error';
    } else if (obj.error == 'Private') {
      error = 'This profile is private.';
      embedMode = 'warn';
    } else if (obj.error == 500 && obj.exc == 'IndexError(\'list index out of range\',)') {
      error = obj.msg || 'api down';
      embedMode = 'down';
    } else {
      error = obj.msg ? `\`${obj.error}\` - \`${obj.msg}\`` : obj.toString();
      embedMode = 'error';
    }
    error += `\nYou requested ${mode == 'link' ? 'to link' : `${mode} stats for`} ${player(battletag, platform)}`;
    return createEmbed({
      battletag,
      platform,
      mode: embedMode,
      error,
      msg
    });
  } else if (data instanceof Error) {
    return createEmbed({
      battletag,
      platform,
      mode: 'error',
      error: `Internal error:\n${data}`,
      msg
    });
  } else return null;
}
//#endregion

/* #region Local utils */

/**
 * Gets the keys associated with the greatest values
 * @param num The number od keys to get
 * @param obj The object to check
 * @param reverse Whether to reverse-sort the keys
 */
function getBestKeys(num: number, obj: Object, reverse = false) {
  if (!num) return [];
  const sortable = [],
    res: string[] = [];
  for (const key in obj) sortable.push([key, obj[key]]);
  sortable.sort((a, b) => {
    return reverse ? a[1] - b[1] : b[1] - a[1];
  });
  for (let i = 0; i < num && i < sortable.length; i++) res.push(sortable[i][0]);
  return res;
}

/**
 * Coverts hero keys into readable names
 * @param str The hero key to convert
 */
function heroName(str: string) {
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

/**
 * Manually locks a 'data' variable into the Region state
 * @param v The variable to lock
 */
// eslint-disable-next-line no-unused-vars
function lockRegion(v: any): v is Region {
  return true;
}

/**
 * Returns a readable version of the target
 * @param battletag 
 * @param platform 
 * @param bold Whether to make battletag and platform bold
 */
function player(battletag: string, platform: string, bold = true) {
  const b = bold ? '**' : '';
  return b + battletag + b + ' - ' + b + platform.toUpperCase() + b;
}

/**
 * Formats a number for the stats
 * @param number 
 */
function statNum(number: number) {
  return readNumber(number, 0);
}

/* #endregion */

export class OverwatchAPI extends API {
  constructor() {
    super('ow', 'Overwatch');
  }

  /**
   * Returns the stored data about a user.
   * @param id The user, guild member or id of the user
   * @param reverse Whether to return keys (default is false)
   */
  checkDatabase(id: string | User | GuildMember, reverse = false) {
    if (id instanceof User || id instanceof GuildMember) id = id.id;
    return !reverse ? this.store.get(id) : this.store.getKey(id.replace('#', '-'));
  }

  /**
   * Fecthes data about the target from the API.
   * @param battletag 
   * @param platform 
   */
  async getRaw(battletag: string, platform: string): Promise<Region | Error | StatusCodeError> {
    if (!battletag) return;
    battletag = battletag.replace('#', '-');

    const cached = cache.get(battletag + platform);
    if (cached) return cached;

    let error: Error;
    const r: OWAPIBlob | ErrorResponse = await request({
      uri: encodeURI(`https://${APIHost || await checkLocalAPI()}/api/v3/u/${battletag}/blob${platform ? `?platform=${platform}` : ''}`),
      headers: {
        'User-Agent': 'request'
      },
      json: true
    }).catch(err => {
      error = err;
    });

    if (!error && typeof r != 'object') error = new Error(`Request resolves into ${typeof r}`);

    if (error) return error;
    else {
      cache.add(battletag + platform, r.any || r.eu);
      return r.any || r.eu;
    }

    /*if (typeof r == 'object') cache.add(battletag + platform, r.any ? r.any : r.eu);
    return typeof r == 'object' ? r.any ? r.any : r.eu : errors[0];*/
  }

  //#region Command methods

  async quick(battletag: string, platform: string, msg: CommandoMessage) {
    const data = await this.getRaw(battletag, platform),
      mode = 'quickplay',
      check = errorCheck(data, [mode, battletag, platform], msg);
    if (check) return check;

    if (lockRegion(data))
      return createEmbed({
        battletag,
        data,
        platform,
        mode,
        msg
      });
  }

  async comp(battletag: string, platform: string, msg: CommandoMessage) {
    const data = await this.getRaw(battletag, platform),
      mode = 'competitive',
      check = errorCheck(data, [mode, battletag, platform], msg);
    if (check) return check;

    if (lockRegion(data))
      return createEmbed({
        battletag,
        data,
        platform,
        mode,
        msg
      });
  }

  async link(battletag: string, platform: string, msg: CommandoMessage) {
    const data = await this.getRaw(battletag, platform),
      mode = 'link',
      check = errorCheck(data, [mode, battletag, platform], msg);
    if (check) return check;

    const prev = this.checkDatabase(msg.author),
      next = [battletag, platform];

    if (next != prev) this.store.set(msg.author.id, next);

    return createEmbed({
      battletag,
      data: prev,
      platform,
      mode,
      msg
    });
  }

  async unlink(battletag: string, platform: string, msg: CommandoMessage) {
    const prev = this.checkDatabase(msg.author);

    if (prev) this.store.delete(msg.author.id);

    //@ts-ignore
    return createEmbed({
      data: prev,
      mode: 'unlink',
      msg
    });
  }

  async hero(battletag: string, platform: string, msg: CommandoMessage, hero: string) {
    const data = await this.getRaw(battletag, platform),
      mode = 'quickplay hero',
      check = errorCheck(data, [mode, battletag, platform, hero], msg);
    if (check) return check;

    const extraData = await getHeroStats(battletag.replace('#', '-'), platform);

    if (lockRegion(data))
      return createEmbed({
        battletag,
        data,
        platform,
        hero,
        mode,
        msg,
        extra: extraData
      });
  }

  async herocomp(battletag: string, platform: string, msg: CommandoMessage, hero: string) {
    const data = await this.getRaw(battletag, platform),
      mode = 'competitive hero',
      check = errorCheck(data, [mode, battletag, platform, hero], msg);
    if (check) return check;

    const extraData = await getHeroStats(battletag.replace('#', '-'), platform);

    if (lockRegion(data))
      return createEmbed({
        battletag,
        data,
        platform,
        hero,
        mode,
        msg,
        extra: extraData
      });
  }

  //#endregion
}

export const ApiLoader = OverwatchAPI;