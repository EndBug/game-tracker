import { SlashCommandSubcommandBuilder } from '@discordjs/builders'
import { CommandInteraction, InteractionReplyOptions, User } from 'discord.js'
import { matchSorter } from 'match-sorter'
import { OverwatchAPI, platform, playerEntry } from '../apis/overwatch'
import { APIUtil } from '../utils/api'
import { CommandOptions, SlashCommandBuilder } from '../utils/commands'
import { heroes, isSupported, supportedHero } from '../utils/ow_hero_names'
import { postCommand } from '../utils/statcord'
import { CHOICES_MAX } from '../utils/utils'

// @ts-expect-error
const API: OverwatchAPI = APIUtil.APIs['ow']

/**
 * Utility function that appends the default Overwatch account options
 * @param subcommand The Subcommand builder you want to append the options to
 * @param user Whether to also add the user mention (default is `true`)
 * @returns A chainable Subcommand builder
 */
function addUserOptions(
  subcommand: SlashCommandSubcommandBuilder,
  user = true
) {
  const res = subcommand
    .addStringOption((o) =>
      o
        .setName('username')
        .setDescription(
          'The battletag (in the name#1234 format), GamerTag, or PSN ID of the user you want to look up.'
        )
    )
    .addStringOption((o) =>
      o
        .setName('platform')
        .setDescription(
          "The platform of the user you're looking up, if you're searching by username. Default value: PC."
        )
        .addChoices([
          ['PC', 'pc'],
          ['Xbox Live', 'xbl'],
          ['PlayStation Network', 'psn']
        ])
    )

  return user
    ? res.addUserOption((o) =>
        o
          .setName('user')
          .setDescription('The guild member you want to search stats for.')
      )
    : res
}

const modes = ['quick', 'comp', 'hero', 'link', 'unlink']

/** Checks whether a string is a valid battletag */
function isBattletag(str: string) {
  const arr = str.split('#')
  return arr.length == 2 && !isNaN(parseInt(arr[1]))
}

/** Gets the hero matches for the given string */
function matchHeroesToString(str: string) {
  const choices = Object.entries(heroes).map(([value, name]) => ({
    name,
    value
  }))

  return matchSorter(choices, str, { keys: ['name', 'value'] }).slice(
    0,
    CHOICES_MAX
  )
}

export const command: CommandOptions = {
  data: new SlashCommandBuilder()
    .setName('ow')
    .setDescription('A collection of commands to get Overwatch stats')
    .addSubcommand((s) =>
      addUserOptions(s)
        .setName('quick')
        .setDescription('Displays quickplay stats for the targeted user.')
    )
    .addSubcommand((s) =>
      addUserOptions(s)
        .setName('comp')
        .setDescription('Displays competitive stats for the targeted user.')
    )
    .addSubcommand((s) =>
      addUserOptions(
        s
          .setName('hero')
          .setDescription('Displays hero stats for the targeted user.')
          .addStringOption((o) =>
            o
              .setName('hero')
              .setDescription('The hero you want to see stats of.')
              .setAutocomplete(true)
          )
          .addStringOption((o) =>
            o
              .setName('mode')
              .setDescription('The mode you want to see hero stats for.')
              .addChoice('Quickplay', 'quick')
              .addChoice('Competitive', 'comp')
          )
      )
    )
    .addSubcommand((s) =>
      addUserOptions(s, false)
        .setName('link')
        .setDescription("Saves your username in the bot's database.")
    )
    .addSubcommand((s) =>
      s
        .setName('unlink')
        .setDescription("Deletes your username from the bot's database.")
    ),

  async onAutocomplete(int) {
    if (int.options.getSubcommand() != 'hero') return

    const currentInput = int.options.getFocused().toString(),
      matched = matchHeroesToString(currentInput)

    return int.respond(matched)
  },

  async run(int) {
    const opt = int.options

    await int.deferReply({ ephemeral: false })
    const sendReply = (options: InteractionReplyOptions) => {
      if (options.ephemeral) {
        int.deleteReply()
        return int.followUp(options)
      } else {
        return int.editReply(options)
      }
    }

    const command = opt.getSubcommand(true),
      user = opt.getUser('user'),
      mode = (opt.getString('mode') || 'quick') as 'quick' | 'comp',
      hero = opt.getString('hero')

    let username = opt.getString('username'),
      platform = opt.getString('platform') as platform

    if (!modes.includes(command))
      throw new Error(`Unexpected ow subcommand: ${command}`)

    if (['quick', 'comp', 'hero'].includes(command)) {
      let res: playerEntry
      try {
        res = await parseTarget({ username, platform, user, int })
      } catch (error) {
        return await sendReply({ content: error, ephemeral: true })
      }

      ;({ username, platform } = res)

      if (command == 'hero') {
        if (hero && !isSupported(hero))
          return await sendReply({
            content: `'${hero}' is not a supported hero key. Use the autocomplete menu to enter the hero, so that you can use the correct hero code.`,
            ephemeral: true
          })
      }
    } else if (command == 'link') {
      if (username && !platform) platform = 'pc'
      else if (!username) {
        const res = await API.checkDatabase(int.user)
        if (res) {
          username = res.username
          platform = res.platform
        } else
          return await sendReply({
            content:
              'Please enter a valid username (and platform, if not on PC).',
            ephemeral: true
          })
      }
    }
    // unlink doesn't need any parsing

    const legacyMode = (
      command == 'hero' ? (mode == 'quick' ? 'hero' : 'herocomp') : command
    ) as 'quick' | 'comp' | 'hero' | 'herocomp' | 'link' | 'unlink'
    postCommand(`ow ${legacyMode}`, int.user.id)

    const sendEmbed = async (hero: supportedHero | 'auto' = 'auto') => {
      const embed = await API[legacyMode](username, platform, int, hero)

      const shouldBeEphemeral =
        ['link', 'unlink'].includes(command) ||
        ['error', 'warn'].includes(embed.mode)

      return sendReply({
        embeds: [embed],
        ephemeral: shouldBeEphemeral
      })
    }

    return sendEmbed(hero as supportedHero | undefined)
  }
}

interface TargetInfo {
  username: string
  platform: platform
  user: User
  int: CommandInteraction
}
async function parseTarget({
  username,
  platform,
  user,
  int
}: TargetInfo): Promise<playerEntry> {
  if (username) {
    if (['xbl', 'psn'].includes(platform)) return { username, platform }
    else {
      if (isBattletag(username)) return { username, platform: platform || 'pc' }
      else
        throw 'If your platform is PC, please use a battletag in the user#1234 format. If your platform is not PC, please make sure to specify it in the proper option.'
    }
  } else {
    if (!user) {
      // !username && !user
      const res = await API.checkDatabase(int.user)
      if (res) return res
      else
        throw "Please enter a username (and platform, if not on PC). If you don't want to enter your username every time, use `ow link` to link it to your Discord profile."
    } else {
      // !username && user
      const res = await API.checkDatabase(user)
      if (res) return res
      else
        throw "The user you mentioned didn't link their Overwatch account. You can still search them by using the `username` and `platform` options."
    }
  }
}
