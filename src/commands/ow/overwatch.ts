import * as Commando from 'discord.js-commando'

import { APIS } from '../../core/app'
import { isMention } from '../../utils/utils'
import { OverwatchAPI } from '../../apis/overwatch' // eslint-disable-line no-unused-vars
import { heroes } from '../../utils/ow_hero_names'

// @ts-ignore
const API: OverwatchAPI = APIS['ow']

const platforms = ['pc', 'xbl', 'psn'],
  otherplatforms = ['xbl', 'psn'],
  modes = ['quick', 'comp', 'link', 'unlink', 'hero', 'herocomp'],
  heromodes = ['hero', 'herocomp'],
  linkmodes = ['link', 'unlink'],
  lazymodes = ['unlink']

/** Checks whether a string is a valid battletag */
function isBattletag(str: string) {
  const arr = str.split('#')
  return (arr.length == 2 && !isNaN(parseInt(arr[1])))
}

/** Checks whether a string corresponds to a hero name, if so, returns the name */
function checkHero(str: string) {
  str = str.toLowerCase()
  if (str == 'auto') return str

  for (const name in heroes) {
    if (name == str) return name
    for (const alias of heroes[name])
      if (alias.toLowerCase() == str) return name
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
      details: 'The main command to access the Overwatch API. To access the online docs and see all the available commands you can go to <https://game-tracker.js.org/#/ow/overwatch>',
      args: [{
        key: 'mode',
        prompt: 'The action you want to perform. If left blank, will redirect to `ow quick`.',
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
    })
  }

  // @ts-ignore
  async run(msg: Commando.CommandoMessage, { mode, player, platform, hero }: { [x: string]: string }) {
    msg.channel.startTyping()

    let err: string,
      exit = false

    if (lazymodes.includes(mode)) exit = true

    if (!exit) {
      if (!mode) {
        const res = API.checkDatabase(msg.author)
        if (res) {
          mode = 'quick';
          [player, platform] = res
          exit = true
        } else err = 'Please enter a valid mode.'
      }
      if (!modes.includes(mode)) err = 'Please enter a valid mode.'
    }

    if (!exit && !err) {
      if (!player) {
        const res = API.checkDatabase(msg.author)
        if (res) [player, platform] = res
        else {
          err = 'Please enter a battletag.'
          if (!linkmodes.includes(mode)) err += ' If you don\'t want to enter your battletag every time, use `ow link` to link it to your Discord profile.'
        }
      } else if (isBattletag(player)) {
        if (!platform) platform = 'pc'
        else if (!platforms.includes(platform)) {
          hero = platform
          platform = 'pc'
        }
      } else if (heromodes.includes(mode)) {
        const res = API.checkDatabase(msg.author)
        hero = player
        if (res) [player, platform] = res
        else {
          err = 'Please enter a battletag.'
          if (!linkmodes.includes(mode)) err += ' If you don\'t want to enter your battletag every time, use `ow link` to link it to your Discord profile.'
        }
      }
      else if (!platform) err = 'Please enter a valid battletag and platform. To see how to write names and platforms, use `help ow`'
      else if (!otherplatforms.includes(platform)) {
        if (isMention(player)) {
          const res = API.checkDatabase(msg.author)
          if (res) {
            if (platform) hero = platform; // lgtm [js/trivial-conditional]
            [player, platform] = res
          } else err = 'This user is not registered, please enter its battletag and platform manually.'
        } else err = 'Please enter a valid battletag and platform. To see how to write names and platforms, use `help ow`'
      }

      if (!err) {
        if (heromodes.includes(mode)) {
          if (!hero) hero = 'auto'
          else if (!checkHero(hero)) err = 'Please enter a valid hero.'
          else hero = checkHero(hero)
        }
      }
    }

    if (err) msg.reply(err)
    else msg.say(await API[mode](player, platform, msg, hero))

    msg.channel.stopTyping(true)
  }
}
