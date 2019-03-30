import * as Commando from 'discord.js-commando';

import { APIS, owner, roles } from '../../core/app';
import { isMention } from '../../utils/utils';
import { OverwatchAPI } from '../../apis/overwatch'; //eslint-disable-line

//@ts-ignore
const API: OverwatchAPI = APIS['ow'];

const heroes = {
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

const platforms = ['pc', 'xbl', 'psn'],
  otherplatforms = ['xbl', 'psn'],
  modes = ['quick', 'comp', 'link', 'unlink', 'hero', 'herocomp'],
  heromodes = ['hero', 'herocomp'],
  lazymodes = ['unlink'];

/**
 * Checks whether a string is a valid battletag
 * @param str 
 */
function isBattletag(str: string) {
  const arr = str.split('#');
  return (arr.length == 2 && !isNaN(parseInt(arr[1])));
}

/**
 * Checks whether a string corresponds to a hero name, if so, returns the name
 * @param str 
 */
function checkHero(str: string) {
  str = str.toLowerCase();
  if (str == 'auto') return str;

  for (const name in heroes) {
    if (name == str) return name;
    for (const alias of heroes[name])
      if (alias.toLowerCase() == str) return name;
  }
}

export default class OverwatchCMD extends Commando.Command {
  constructor(client: Commando.CommandoClient) {
    super(client, {
      name: 'ow',
      aliases: ['overwatch'],
      group: 'ow',
      memberName: 'ow',
      description: 'Overwatch API interface',
      details: 'The main command to access the Overwatch API.',
      args: [{
        key: 'mode',
        prompt: 'The action you want to perform. If left blank, will redirect to `ow quick`', // todo
        type: 'string',
        default: ''
      }, {
        key: 'player',
        prompt: 'The player you want the stats for. If you have already linked your account in this guild, you can leave this blank, otherwise you need to write your Battletag (e.g. `Name#1234`). You can also mention another user: if they linked their account, it will display their stats.',
        type: 'string',
        default: ''
      }, {
        key: 'platform',
        prompt: 'The platform you want stats for. If none is entered, it will display stats for `pc`.',
        type: 'string',
        default: ''
      }, {
        key: 'hero',
        prompt: 'The hero you want stats for.',
        type: 'string',
        default: ''
      }],
      guildOnly: true
    });
  }

  //@ts-ignore
  async run(msg: Commando.CommandoMessage, { mode, player, platform, hero }: { [x: string]: string }) {
    msg.channel.startTyping();

    let err: string,
      exit = false;

    if (lazymodes.includes(mode)) exit = true;

    if (!exit) {
      if (!mode) {
        const res = API.checkDatabase(msg.author);
        if (res) {
          mode = 'quick';
          [player, platform] = res;
          exit = true;
        } else err = 'Please enter a valid mode.';
      }
      if (!modes.includes(mode)) err = 'Please enter a valid mode.';
    }

    if (!exit && !err) {
      if (!player) {
        const res = API.checkDatabase(msg.author);
        if (res) [player, platform] = res;
        else err = 'Please enter a battletag. If you don\'t want to enter your battletag every time, use `ow link` to link it to your Discord profile.';
      } else if (isBattletag(player)) {
        if (!platform) platform = 'pc';
        else if (!platforms.includes(platform)) {
          hero = platform;
          platform = 'pc';
        }
      } else if (heromodes.includes(mode)) {
        const res = API.checkDatabase(msg.author);
        hero = player;
        if (res) [player, platform] = res;
        else err = 'Please enter a battletag. If you don\'t want to enter your battletag every time, use `ow link` to link it to your Discord profile.';
      }
      else if (!platform) err = 'Please enter a valid battletag and platform. To see how to write names and platforms, use `help ow`';
      else if (!otherplatforms.includes(platform)) {
        if (isMention(player)) {
          const res = API.checkDatabase(msg.author);
          if (res) {
            if (platform) hero = platform;
            [player, platform] = res;
          } else err = 'This user is not registered, please enter its battletag and platform manually.';
        } else err = 'Please enter a valid battletag and platform. To see how to write names and platforms, use `help ow`';
      }

      if (!err) {
        if (heromodes.includes(mode)) {
          if (!hero) hero = 'auto';
          else if (!checkHero(hero)) err = 'Please enter a valid hero.';
          else hero = checkHero(hero);
        }
      }
    }

    // #region Old argument parsing
    /*
    if (platform) { // do we have anything?
      if (!platforms.includes(platform)) { // is it NOT valid?
        if (heromodes.includes(mode)) { // are we in heromode?
          if (!hero) { // we need a hero
            hero = platform;
            platform = 'pc';
          } else err = 'Please enter a valid platform.';
        } else err = 'Please enter a valid platform.';
      } // ok
    } else platform = 'pc';
    if (!hero) hero = 'auto';

    if (!err) {
      if (player) { // do we have anything?
        if (isMention(player)) { // is it a mention?
          const member = msg.guild.members.get(mentionToID(player));
          if (member) { // is it a valid user?
            const res = API.checkDatabase(member);
            if (res) { // is the user in the DB?
              // if (!hero) hero = platform;
              [player, platform] = res;
            } else err = 'This user has not linked their account: try using their battletag/GamerTag/PSN ID.';
          } else err = 'Please mention a valid member of this guild.';
        } else if (!isBattletag(player) && !otherplatforms.includes(platform)) { // is it NOT a battletag AND the platform is NOT pc?
          if (heromodes.includes(mode)) { // is it a hero mode?
            const res = API.checkDatabase(msg.author);
            if (res) { // is the author in the database?
              hero = player;
              [player, platform] = res;
            } else err = 'Please enter a valid battletag/GamerTag/PSN ID.';
          } else err = 'Please enter a valid battletag/GamerTag/PSN ID.';
        } // that's ok as it is
      } else if (!lazymodes.includes(mode)) { // is it mandatory?
        const res = API.checkDatabase(msg.author);
        if (res) { // is the author in the DB?
          [player, platform] = res;
        } else err = 'Please enter a battletag/GamerTag/PSN ID.';
      } // whatever

      if (!err) {
        if (heromodes.includes(mode)) { // are we in heromode?
          if (hero) { // do we have anything?
            const res = checkHero(hero);
            if (res) { // is that a valid name?
              hero = res;
            } else err = 'Please enter a valid hero name.';
          } else hero = 'auto';
        } // whatever
      }
    }
    */
    // #endregion

    if (err) msg.reply(err);
    else msg.say(await API[mode](player, platform, msg, hero));

    msg.channel.stopTyping(true);
  }

  hasPermission(msg: Commando.CommandoMessage) {
    if ([owner, msg.guild.owner.user].includes(msg.author)) return true;
    const member = msg.member;
    if (member) return (member.roles.has(roles.dev.id) || msg.guild.settings.get('botperm', {
      members: []
    }).members.includes(member.id));
    else return 'Can\'t define your permissions, please contact the owner of the server.';
  }
}
