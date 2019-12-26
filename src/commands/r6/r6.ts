import { Command, CommandoClient, CommandoMessage } from 'discord.js-commando'; // eslint-disable-line no-unused-vars
import { RainbowAPI, isPlatform, constants } from '../../apis/rainbow'; // eslint-disable-line no-unused-vars
import { APIS } from '../../core/app';
import { isMention, mentionToID } from '../../utils/utils';

// @ts-ignore
const API: RainbowAPI = APIS['r6'];

// #region Utility
const validMethods = ['general', 'modes', 'wp', 'op', 'types', 'queue', 'link', 'unlink'],
  validPlatforms = ['uplay', 'xbl', 'psn'];

// #region Command
const commandAliases = ['r6s', 'rainbow', 'rainbow6siege'];

/** Generates an alias array for the sub-commands */
function getAliases(name: string) {
  name = name.replace(new RegExp('/r6/', 'g'), '').trim();
  return commandAliases.map(al => al + ' ' + name);
}

/** Generates an example array for a Rainbow 6 Siege sub-command
 * @param examples A record of arguments-description
 * @example getExamples('general', {'all user plat' : 'This is the description'});
 */
function getExamples(method: string, examples: Record<string, string>) {
  const res: string[] = [];
  for (const args in examples) {
    const desc = examples[args];
    res.push(`\`r6 ${method.trim()} ${args.trim()}\` - ${desc.trim()}`);
  }
  return res;
}

interface configParams {
  /** The description of the command */
  description: string
  /** Some technical info on how to use it, to put before the "player" info */
  details: string
  /** A record of arguments-description
   * @example {'all user plat' : 'This is the description'}
   */
  examples: Record<string, string>
  /** The identifier for the extra, if any */
  extra?: string
}

/** Generates a config for a Rainbow 6 Siege sub-command
 * @param options The parameters to build the config
 */
export function getConfig(method: string, { description, details, examples, extra }: configParams) {
  const format = `${extra ? (requiresExtra(method) ? `<${extra}>` : `[${extra}]`) : ''} { username | @mention } [platform: (${validPlatforms.join(' | ')})]`;

  return {
    name: `r6 ${method}`,
    memberName: `r6-${method}`,
    group: 'r6',
    aliases: getAliases(method),
    description,
    details: details.trim() + '\nTo specify the player, enter their username and platform. You can also mention a Discord user and, if they linked their account to this bot, it will display their stats. If left blank, the bot will try to show your profile (if you `r6 link`ed it).',
    format,
    examples: getExamples(method, examples),
    guildOnly: true
  };
}
// #endregion

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

// #region Name utilities
function isWeaponName(str: string) {
  return typeof str == 'string'
    && constants.WEAPONS.map(wp => wp.name.toLowerCase().split(' ').join('-'))
      .includes(str.toLowerCase().split(' ').join('-'));
}

function getWeaponName(str: string) {
  return constants.WEAPONS.map(wp => wp.name.toLowerCase().split(' ').join('-'))
    .find(name => name == str.toLowerCase().split(' ').join('-'));
}

function isWeaponType(str: string) {
  return typeof str == 'string'
    && Object.values(constants.WEAPONTYPES).map(wt => wt.toLowerCase().split(' ').join('-'))
      .includes(str.toLowerCase().split(' ').join('-'));
}

function getWeaponType(str: string) {
  return Object.values(constants.WEAPONTYPES).map(wt => wt.toLowerCase().split(' ').join('-'))
    .find(name => name == str.toLowerCase().split(' ').join('-'));
}

function isOperator(str: string) {
  return typeof str == 'string'
    && constants.OPERATORS.map(op => op.name.toLowerCase().split(' ').join('-'))
      .includes(str.toLowerCase().split(' ').join('-'));
}

// #endregion

// #endregion

export default class RainbowCMD extends Command {
  constructor(client: CommandoClient) {
    super(client, {
      name: 'r6',
      memberName: 'r6',
      aliases: commandAliases,
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
        prompt: 'The extra argument needed for some sub-commands.',
        type: 'string',
        default: ''
      }, {
        key: 'player',
        prompt: 'The player you want the stats for. If you have already linked your account you can leave this blank, otherwise you\'ll need to write your username. You can also mention another user: if they linked their account, it will display their stats.',
        type: 'string',
        default: ''
      }, {
        key: 'platform',
        prompt: `The platform the user plays on.If none is entered, it will use \`uplay\` as default. Currently supported platforms: ${validPlatforms.map(str => `\`${str}\``).join(', ')}.`,
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
