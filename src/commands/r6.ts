import { SlashCommandSubcommandBuilder } from '@discordjs/builders'
import { constants as r6constants } from 'r6api.js'
import { CommandOptions, SlashCommandBuilder } from '../utils/commands'
import { playerEntry, RainbowAPI } from '../apis/rainbow'
import { CommandInteraction, User } from 'discord.js'
import { APIUtil } from '../utils/api'
import { postCommand } from '../utils/statcord'
import { matchSorter } from 'match-sorter'
import { CHOICES_MAX } from '../utils/utils'

type platform = 'uplay' | 'xbl' | 'psn'
const modes = ['general', 'modes', 'wp', 'op', 'queue', 'link', 'unlink']

// @ts-expect-error
const API: RainbowAPI = APIUtil.APIs['r6']

export const command: CommandOptions = {
  data: new SlashCommandBuilder()
    .setName('r6')
    .setDescription('A collection of commands to get Rainbow 6 Siege stats')
    .addSubcommand((s) =>
      addUserOptions(
        s
          .setName('general')
          .setDescription('Displays general stats for the given play types.')
          .addStringOption((o) =>
            o
              .setName('playtype')
              .setDescription(
                'Select whether you want to see stats for PvP, PvE, or both.'
              )
              .addChoices([
                ['PvP', 'pvp'],
                ['PvE', 'pve'],
                ['Both', 'all']
              ])
          )
      )
    )
    .addSubcommand((s) =>
      addUserOptions(
        s
          .setName('modes')
          .setDescription('Displays modes stats for the given play type.')
          .addStringOption((o) =>
            o
              .setName('playtype')
              .setDescription(
                'Select whether you want to see stats for PvP or PvE.'
              )
              .addChoices([
                ['PvP', 'pvp'],
                ['PvE', 'pve']
              ])
              .setRequired(true)
          )
      )
    )
    .addSubcommand((s) =>
      addUserOptions(
        s
          .setName('wp')
          .setDescription('Displays weapon stats for the given weapon.')
          .addStringOption((o) =>
            o
              .setName('weapon')
              .setDescription('The weapon you want to see stats of.')
              .setAutocomplete(true)
              .setRequired(true)
          )
      )
    )
    .addSubcommand((s) =>
      addUserOptions(
        s
          .setName('wp-cat')
          .setDescription(
            'Displays weapon stats for the given weapon category.'
          )
          .addStringOption((o) =>
            o
              .setName('category')
              .setDescription('The category you want to see stats of. ')
              .addChoices(
                Object.values(r6constants.WEAPONTYPES).map((e) => [
                  e.name,
                  e.id
                ])
              )
          )
      )
    )
    .addSubcommand((s) =>
      addUserOptions(
        s
          .setName('op')
          .setDescription('Displays operator stats for the given operator.')
          .addStringOption((o) =>
            o
              .setName('operator')
              .setDescription('The operator you want to see stats of.')
              .setAutocomplete(true)
              .setRequired(true)
          )
      )
    )
    .addSubcommand((s) =>
      addUserOptions(
        // This serves as command for both the "queue" and "types" embed, which correspond to pvp and pve
        s
          .setName('queue')
          .setDescription('Displays queue stats for the given play type.')
          .addStringOption((o) =>
            o
              .setName('playtype')
              .setDescription(
                'Select whether you want to see stats for PvP or PvE.'
              )
              .addChoices([
                ['PvP', 'pvp'],
                ['PvE', 'pve']
              ])
              .setRequired(true)
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

  onAutocomplete(int) {
    const command = int.options.getSubcommand()
    if (!['wp', 'op'].includes(command)) return

    const currentInput = int.options.getFocused().toString()

    let choices: { name: string; value: string }[]
    if (command == 'wp') {
      choices = Object.entries(r6constants.WEAPONS).map(([key, value]) => ({
        name: value.name,
        value: key
      }))
    } else if (command == 'op') {
      choices = Object.entries(r6constants.OPERATORS).map(([key, value]) => ({
        name: value.name,
        value: key
      }))
    }

    const matched = matchSorter(choices, currentInput, {
      keys: ['name', 'value']
    }).slice(0, CHOICES_MAX)

    int.respond(matched)
  },

  async run(int) {
    const opt = int.options

    const command = opt.getSubcommand(true),
      user = opt.getUser('user'),
      playType = opt.getString('playtype'),
      wpCat = opt.getString('category')

    let username = opt.getString('username'),
      platform = opt.getString('platform') as platform

    if (!modes.includes(command))
      throw new Error(`Unexpected ow subcommand: ${command}`)

    int.deferReply()

    if (['general', 'modes', 'wp', 'wp-cat', 'op', 'queue'].includes(command)) {
      let res: playerEntry
      try {
        res = await parseTarget({ username, platform, user, int })
      } catch (error) {
        return await int.reply({ content: error, ephemeral: true })
      }

      if (res) {
        username = res.username
        platform = res.platform as platform
      }
    } else if (command == 'link') {
      if (username && !platform) platform = 'uplay'
      else if (!username) {
        const res = await API.checkDatabase(int.user)
        if (res) {
          username = res.username
          platform = res.platform as platform
        } else
          return await int.reply({
            content:
              'Please enter a valid username (and platform, if not on PC).',
            ephemeral: true
          })
      }
    }
    // unlink doesn't need any parsing

    const legacyMode = (
      command == 'queue' && playType == 'pve'
        ? 'types'
        : command == 'wp-cat'
        ? 'wp'
        : command
    ) as
      | 'general'
      | 'modes'
      | 'wp'
      | 'op'
      | 'queue'
      | 'types'
      | 'link'
      | 'unlink'

    postCommand(`r6 ${legacyMode}`, int.user.id)

    const sendEmbed = async (extra: string | undefined) => {
      // @ts-expect-error
      const embed = await API[legacyMode](int, username, platform, extra)
      return int.reply({
        embeds: [embed],
        ephemeral: ['link', 'unlink'].includes(command) || embed.type == 'error'
      })
    }

    if (command == 'wp') {
      const weapon = opt.getString('weapon')
      if (!weapon)
        return int.reply({
          content:
            'You must enter a valid weapon name, you can use the autocomplete menu to pick one.',
          ephemeral: true
        })
      return sendEmbed(weapon)
    } else if (command == 'op') {
      const operator = opt.getString('operator')
      if (!operator)
        return int.reply({
          content:
            'You must enter a valid operator name, you can use the autocomplete menu to pick one.',
          ephemeral: true
        })
      return sendEmbed(operator)
    } else {
      return sendEmbed(wpCat)
    }
  }
}

function addUserOptions(
  subcommand: SlashCommandSubcommandBuilder,
  user = true
) {
  const res = subcommand
    .addStringOption((o) =>
      o
        .setName('username')
        .setDescription(
          'The username of the user you want to look up. Adding the platform too is required for non-PC users.'
        )
    )
    .addStringOption((o) =>
      o
        .setName('platform')
        .setDescription(
          "The platform of the user you're looking up, if you're searching by username. Default: UPlay."
        )
        .addChoices([
          ['UPlay', 'uplay'],
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
  if (username) return { username, platform: platform || 'uplay' }

  if (!username && !user) {
    const res = await API.checkDatabase(int.user)
    if (res) return res
    else
      throw "Please enter a username (and platform, if not on PC). If you don't want to enter your username every time, use `r6 link` to link it to your Discord profile."
  }

  if (!username && user) {
    const res = await API.checkDatabase(user)
    if (res) return res
    else
      throw "The user you mentioned didn't link their Rainbow 6 Siege account. You can still search them by using the `username` and `platform` options."
  }
}
