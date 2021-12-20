import { isMention, escapeMentions } from '../../utils/utils'
import { OverwatchAPI } from '../../apis/overwatch'
import { heroes } from '../../utils/ow_hero_names'
import { APIUtil } from '../../utils/api'
import { Command } from '../../utils/command'
import { Message } from 'discord.js'
import { postCommand } from '../../utils/statcord'

// @ts-expect-error
const API: OverwatchAPI = APIUtil.APIs['ow']

const platforms = ['pc', 'xbl', 'psn'],
  otherplatforms = ['xbl', 'psn'],
  modes = ['quick', 'comp', 'link', 'unlink', 'hero', 'herocomp'],
  heromodes = ['hero', 'herocomp'],
  linkmodes = ['link', 'unlink'],
  lazymodes = ['unlink']

/** Checks whether a string is a valid battletag */
function isBattletag(str: string) {
  const arr = str.split('#')
  return arr.length == 2 && !isNaN(parseInt(arr[1]))
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

export default class OverwatchCMD extends Command {
  constructor() {
    super({
      name: 'ow',
      aliases: ['overwatch'],
      description: 'Overwatch API interface',
      details: 'The main command to access the Overwatch API.',
      onlineDocs: 'base',
      args: [
        {
          key: 'mode',
          prompt:
            'The action you want to perform. If left blank, will redirect to `ow quick`.',
          default: ''
        },
        {
          key: 'player',
          prompt:
            'The player you want the stats for. If you have already linked your account in this guild, you can leave this blank, otherwise you need to write your Battletag (e.g. `Name#1234`). You can also mention another user: if they linked their account, it will display their stats.',
          default: ''
        },
        {
          key: 'platform',
          prompt:
            'The platform you want stats for. If none is entered, it will display stats for `pc`.',
          default: ''
        },
        {
          key: 'hero',
          prompt: 'The hero you want stats for.',
          default: ''
        }
      ],
      guildOnly: true,
      hidden: true
    })
  }

  async run(msg: Message, [mode, player, platform, hero]: string[]) {
    msg.channel.startTyping()

    let err: string,
      exit = false

    if (lazymodes.includes(mode)) exit = true

    if (!exit) {
      if (!mode) {
        const res = await API.checkDatabase(msg.author)
        if (res) {
          mode = 'quick'
          player = res.username
          platform = res.platform
          exit = true
        } else {
          mode = null
          err = 'Please enter a valid mode.'
        }
      }
      if (!modes.includes(mode)) {
        mode = null
        err = 'Please enter a valid mode.'
      }
    }

    if (!exit && !err) {
      if (!player) {
        const res = await API.checkDatabase(msg.author)
        if (res) {
          player = res.username
          platform = res.platform
        } else {
          err = 'Please enter a battletag.'
          if (!linkmodes.includes(mode))
            err +=
              " If you don't want to enter your battletag every time, use `ow link` to link it to your Discord profile."
        }
      } else if (isBattletag(player) || otherplatforms.includes(platform)) {
        if (!platform) platform = 'pc'
        else if (!platforms.includes(platform)) {
          hero = platform
          platform = 'pc'
        }
      } else if (heromodes.includes(mode)) {
        const res = await API.checkDatabase(msg.author)
        hero = player
        if (res) {
          player = res.username
          platform = res.platform
        } else {
          err = 'Please enter a battletag.'
          if (!linkmodes.includes(mode))
            err +=
              " If you don't want to enter your battletag every time, use `ow link` to link it to your Discord profile."
        }
      } else if (!platform)
        err =
          'Please enter a valid battletag and platform. To see how to write names and platforms, use `help ow`'
      else if (!otherplatforms.includes(platform)) {
        if (isMention(player)) {
          const res = await API.checkDatabase(msg.author)
          if (res) {
            // prettier-ignore
            if (platform) // lgtm [js/trivial-conditional]
              hero = platform // lgtm [js/trivial-conditional]

            player = res.username
            platform = res.platform
          } else
            err =
              'This user is not registered, please enter its battletag and platform manually.'
        } else
          err =
            'Please enter a valid battletag and platform. To see how to write names and platforms, use `help ow`'
      }

      if (!err) {
        if (heromodes.includes(mode)) {
          if (!hero) hero = 'auto'
          else if (!checkHero(hero)) err = 'Please enter a valid hero.'
          else hero = checkHero(hero)
        }
      }
    }

    postCommand(`${this.name} ${mode || '???'}`, msg.author.id)
    if (err)
      return msg
        .reply(escapeMentions(err), { allowedMentions: { parse: [] } })
        .finally(() => msg.channel.stopTyping(true))
    else
      return msg.channel
        .send(await API[mode](player, platform, msg, hero))
        .finally(() => msg.channel.stopTyping(true))
  }
}
