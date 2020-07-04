import { RainbowAPI, isPlatform, isWeaponName, isWeaponType, isOperator, getWeaponName, getWeaponType, getOperator } from '../../apis/rainbow'
import { isMention, mentionToID } from '../../utils/utils'
import { Command, CommandInfo } from '../../utils/command'
import { APIUtil } from '../../utils/api'
import { Message } from 'discord.js'

// @ts-ignore
const API: RainbowAPI = APIUtil.APIs['r6']

// #region Utility
const validMethods = ['general', 'modes', 'wp', 'op', 'types', 'queue', 'link', 'unlink'],
  validPlatforms = ['uplay', 'xbl', 'psn']

// #region Command
const commandAliases = ['r6s', 'rainbow', 'rainbow6siege']

/** Generates an alias array for the sub-commands */
function getAliases(name: string) {
  name = (name || '').replace(new RegExp('/r6/', 'g'), '').trim()
  return commandAliases.map(al => al + ' ' + name)
}

/** Generates an example array for a Rainbow 6 Siege sub-command
 * @param examples A record of arguments-description
 * @example getExamples('general', {'all user plat' : 'This is the description'});
 */
function getExamples(method: string, examples: Record<string, string>) {
  const res: string[] = []
  for (const args in examples) {
    const desc = examples[args]
    res.push(`\`r6 ${method.trim()} ${args.trim()}\` - ${desc.trim()}`)
  }
  return res
}

interface configParams {
  /** The description of the command */
  description: string
  /** Some technical info on how to use it, to put before the "player" info */
  details?: string
  /** A record of arguments-description
   * @example {'all user plat' : 'This is the description'}
   */
  examples: Record<string, string>
  /** The identifier for the extra, if any */
  extra?: string
  /** Whether this command should not be displayed in the help menu */
  hidden?: boolean
}

/** Generates a config for a Rainbow 6 Siege sub-command
 * @param options The parameters to build the config
 */
export function getConfig(method: string, { description, details, examples, extra, hidden }: configParams): CommandInfo {
  const format = `${extra ? (requiresExtra(method) ? `<${extra}>` : `[${extra}]`) : ''} { username | @mention } [platform: (${validPlatforms.join(' | ')})]`

  return {
    name: `r6 ${method}`,
    aliases: getAliases(method),
    description,
    details: (details || '').trim() + '\nTo specify the player, enter their username and platform; if the username has any space, replace them with a percent sign (%). You can also mention a Discord user and, if they linked their account to this bot, it will display their stats. If left blank, the bot will try to show your profile (if you `r6 link`ed it).',
    format,
    examples: getExamples(method, examples),
    guildOnly: true,
    hidden: hidden || false
  }
}
// #endregion

/** Returns whether the string is a valid r6s method */
function isValidMethod(str: string) {
  return validMethods.includes(str)
}

/** Returns whether the method requires an extra argument */
function requiresExtra(method: string) {
  return ['general', 'modes', 'wp', 'op'].includes(method)
}

/** Returns whether an extra is valid for method being used */
function isValidExtra(method: string, extra: string) {
  if (!requiresExtra(method)) return undefined

  const m = method, e = extra
  return m == 'general' ? ['all', 'pvp', 'pve'].includes(e) :
    m == 'modes' ? ['pvp', 'pve'].includes(e) :
      m == 'wp' ? isWeaponName(e) || isWeaponType(e) :
        m == 'op' ? e == 'auto' || isOperator(e) :
          false
}

/** Replaces the spacers with actual spaces */
function parseUsername(username: string) {
  return username.replace(/%/g, ' ')
}

// #endregion

export default class RainbowCMD extends Command {
  constructor() {
    super({
      name: 'r6',
      aliases: commandAliases,
      description: 'Rainbow 6 Siege API interface',
      details: 'The main command to access the Rainbow 6 Siege API.',
      onlineDocs: 'base',
      args: [{
        key: 'method',
        prompt: 'The action you want to perform.',
        parse: (str: string) => str.toLowerCase()
      }, {
        key: 'extra',
        prompt: 'The extra argument needed for some sub-commands.',
        default: ''
      }, {
        key: 'player',
        prompt: 'The player you want the stats for. If you have already linked your account you can leave this blank, otherwise you\'ll need to write your username. You can also mention another user: if they linked their account, it will display their stats.',
        default: ''
      }, {
        key: 'platform',
        prompt: `The platform the user plays on.If none is entered, it will use \`uplay\` as default. Currently supported platforms: ${validPlatforms.map(str => `\`${str}\``).join(', ')}.`,
        default: ''
      }],
      guildOnly: true,
      hidden: true
    })
  }

  async run(msg: Message, [method, extra, player, platform]: string[]) {
    msg.channel.startTyping()

    let err: string,
      exit = false

    if (method == 'unlink') exit = true
    else if (!isValidMethod(method)) err = `\`${method}\` is not a valid method. Currently supported methods: ${validMethods.map(str => `\`${str}\``).join(', ')}.`

    // EXTRA check
    if (!exit && !err) { // method is valid
      if (extra) { // if there's an extra...
        if (!requiresExtra(method)) { // ...but there shouldn't => swap
          platform = player
          player = extra
          extra = undefined
        } else if (!isValidExtra(method, extra)) {// ...but it's not acceptable => error
          err = `\`${extra}\` is not an acceptable argument for this command. Please refer to the command's \`help\` page for more info.`
        }
      } else { // if there's no extra...
        if (requiresExtra(method)) { // ...but there should be => error
          err = 'This command requires an extra argument. Please refer to the command\'s `help` page for more info.'
        } else { // ...and we don't need one => we'll need to fetch player & platform from the database
          player = undefined
          platform = undefined
        }
      }
    }
    // PLAYER check
    if (!exit && !err) {
      if (isMention(player)) {
        const stored = API.checkDatabase(mentionToID(player))
        if (stored) {
          player = stored[0]
          platform = stored[1]
        } else {
          err = 'This user hasn\'t linked their R6S account yet, please enter their username and platform manually. For more info, please refer to the command\'s `help` page.'
        }
      } else if (player) {
        if (!platform) platform = 'uplay'
        platform = platform.toLowerCase()
        if (isPlatform(platform)) {
          // USERNAME check
          player = parseUsername(player)
          const id = await API.getID(player, platform)
          if (!id) err = `No player named \`${player}\` has been found on the \`${platform}\` platform.`
        } else {
          err = `\`${platform}\` is not a valid platform. Currently supported platforms: ${validPlatforms.map(str => `\`${str}\``).join(', ')}.`
        }
      } else if (method != 'link') {
        const stored = API.checkDatabase(msg.author)
        if (stored) {
          player = stored[0]
          platform = stored[1]
        } else {
          err = 'You didn\'t link any account, please enter a valid username and platform or link one with `r6 link`. For more info, please refer to the command\'s `help` page.'
        }
      }
    }

    if (err) return msg.reply(err).finally(() => msg.channel.stopTyping())
    else {
      if (method == 'wp') {
        if (isWeaponName(extra)) extra = getWeaponName(extra)
        else if (isWeaponType(extra)) extra = getWeaponType(extra)
      } else if (method == 'op') extra = getOperator(extra)
      return msg.channel.send(await API[method](msg, player, platform, extra)).finally(() => msg.channel.stopTyping())
    }
  }
}
