import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando'; // eslint-disable-line no-unused-vars
import { isWeaponName, isWeaponType, isOperator } from 'r6api.js/ts-utils';
import { RainbowAPI, isPlatform } from '../../apis/rainbow'; // eslint-disable-line no-unused-vars
import { APIS } from '../../core/app';
import { isMention, mentionToID } from '../../utils/utils';

// @ts-ignore
const API: RainbowAPI = APIS['r6'];

// #region Utility
const validMethods = ['general', 'modes', 'wp', 'op', 'types', 'queue', 'link', 'unlink'],
  validPlatforms = ['uplay', 'xbl', 'psn'];

/** Returns whether the string is a valid r6s method */
function isValidMethod(str: string) {
  return validMethods.includes(str);
}

/** Returns whether the method requires an extra argument */
function requiresExtra(method: string) {
  return ['general', 'modes', 'wp', 'op'].includes(method);
}

/** Returns whether an extra is valid for method being used */
function isValidExtra(method: string, extra: string) {
  if (!requiresExtra(method)) return undefined;

  const m = method, e = extra;
  return m == 'general' ? ['all', 'pvp', 'pve'].includes(e) :
    m == 'modes' ? ['pvp', 'pve'].includes(e) :
      m == 'wp' ? isWeaponName(e) || isWeaponType(e) :
        m == 'op' ? e == 'auto' || isOperator(e) :
          false;
}
// #endregion

export class RainbowCMD extends Command {
  constructor(client: CommandoClient) {
    super(client, {
      name: 'r6',
      memberName: 'r6',
      aliases: ['r6s', 'rainbow', 'rainbow6siege'],
      group: 'r6',
      description: 'Rainbow 6 Siege API interface',
      details: 'The main command to access the Rainbow 6 Siege API.',
      args: [{
        key: 'method',
        prompt: 'The action you want to perform.',
        type: 'string',
        parse: (str: string) => str.toLowerCase()
      }, {
        key: 'extra',
        prompt: 'TODO',
        type: 'string',
        default: ''
      }, {
        key: 'player',
        prompt: 'The player you want the stats for. If you have already linked your account you can leave this blank, otherwise you\'ll need to write your username. You can also mention another user: if they linked their account, it will display their stats.',
        type: 'string',
        default: ''
      }, {
        key: 'platform',
        prompt: `The platform the user plays on. If none is entered, it will use \`uplay\` as default. Currently supported platforms: ${validPlatforms.map(str => `\`${str}\``).join(', ')}.`,
        type: 'string',
        default: ''
      }],
      guildOnly: true
    });
  }

  // @ts-ignore
  async run(msg: CommandoMessage, { method, extra, player, platform }: Record<string, string>) {
    msg.channel.startTyping();

    let err: string,
      exit = false,
      id: string;

    if (method == 'unlink') exit = true;
    else if (!isValidMethod(method)) err = `\`${method}\` is not a valid method. Currently supported methods: ${validMethods.map(str => `\`${str}\``).join(', ')}.`;

    // EXTRA check
    if (!exit && !err) { // method is valid
      if (extra) { // if there's an extra...
        if (!requiresExtra(method)) { // ...but there shouldn't => swap
          platform = player;
          player = extra;
          extra = undefined;
        } else if (!isValidExtra(method, extra)) {// ...but it's not acceptable => error
          err = `\`${extra}\` is not an acceptable argument for this command. Please refer to the command's \`help\` page for more info.`;
        }
      } else { // if there's no extra...
        if (requiresExtra(method)) { // ...but there should be => error
          err = 'This command requires an extra argument. Please refer to the command\'s `help` page for more info.';
        } else { // ...and we don't need one => we'll need to fetch player & platform from the database
          player = undefined;
          platform = undefined;
        }
      }
    }

    // PLAYER check
    if (!exit && !err) {
      if (isMention(player)) {
        const stored = API.checkDatabase(mentionToID(player));
        if (stored) {
          id = stored[0];
          platform = stored[1];
        } else {
          err = 'This user hasn\'t linked their R6S account yet, please enter their username and platform manually. For more info, please refer to the command\'s `help` page.';
        }
      } else if (player) {
        if (!platform) platform = 'uplay';
        platform = platform.toLowerCase();
        if (isPlatform(platform)) {
          // USERNAME check
          id = await API.getID(player, platform);
          if (!id) err = `No player named \`${player}\` has been found on the \`${platform}\` platform.`;
        } else {
          err = `\`${platform}\` is not a valid platform. Currently supported platforms: ${validPlatforms.map(str => `\`${str}\``).join(', ')}.`;
        }
      } else if (method != 'link') {
        const stored = API.checkDatabase(msg.author);
        if (stored) {
          id = stored[0];
          platform = stored[1];
        } else {
          err = 'You didn\'t link any account, please enter a valid username and platform or link one with `r6 link`. For more info, please refer to the command\'s `help` page.';
        }
      }
    }

    if (err) msg.reply(err);
    else {
      if (method == 'link') id = player;
      msg.say(await API[method](msg, id, platform, extra));
    }

    msg.channel.stopTyping();
  }
}
