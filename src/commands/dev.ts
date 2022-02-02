import { client, homeguildID, owner, ownerID } from '../core/app'
import { CommandOptions, SlashCommandBuilder } from '../utils/commands'
import { APITable, provider } from '../utils/provider'
import { APIUtil } from '../utils/api'
import fs from 'fs'
import path from 'path'
import { poster } from '../utils/stats_poster'

export const command: CommandOptions = {
  data: new SlashCommandBuilder()
    .setName('dev')
    .setDescription(
      'A collection of commands for the developers, not available to the public.'
    )
    .setDefaultPermission(false)
    .addSubcommand((s) =>
      s.setName('backup').setDescription('Upload a new backup.')
    )
    .addSubcommand((s) =>
      s
        .setName('stats')
        .setDescription('Show some bot-related insights.')
        .addStringOption((o) =>
          o
            .setName('type')
            .setDescription('The type of stat to show.')
            .setRequired(true)
            .addChoices([
              ['Database', 'database'],
              ['Guilds', 'guilds'],
              ['Last reload date', 'reload']
            ])
        )
    )
    .addSubcommand((s) =>
      s
        .setName('off')
        .setDescription(
          'Makes a backup of the database (if backup is available) and turns off the bot.'
        )
        .addBooleanOption((o) =>
          o
            .setName('force')
            .setDescription('Whether you want to force the shutdown.')
        )
    )
    .addSubcommand((s) =>
      s
        .setName('restart')
        .setDescription(
          'Makes a backup of the database (if backup is available) and restarts the bot.'
        )
        .addBooleanOption((o) =>
          o
            .setName('force')
            .setDescription('Whether you want to force the restart.')
        )
    )
    .addSubcommand((s) =>
      s
        .setName('poststats')
        .setDescription('Manually posts bot stats using dbots.js.')
    ),

  guildID: homeguildID,
  permissions: [
    {
      type: 'USER',
      id: ownerID,
      permission: true
    }
  ],

  async run(int) {
    // Runtime check to verify that the user actually has permission to run one of these commands
    if (int.user.id != ownerID) {
      int.reply({
        content: "You can't use this command, it's reserved for developers.",
        ephemeral: true
      })
      owner.send(
        `Dev command permissions not set correctly. Potential issue:\n\`\`\`\n${JSON.stringify(
          int,
          null,
          2
        )}\n\`\`\``
      )
    }

    switch (int.options.getSubcommand(true)) {
      case 'stats': {
        const stat = int.options.getString('type', true)

        switch (stat) {
          case 'database': {
            const stats = await provider.stats()

            let str = 'Here is the current database:\n'
            for (const key in stats) {
              str += `- ${APIUtil.getAPIName(key as APITable)} (${
                stats[key]
              }):\n`
            }

            await int.reply(str)
            break
          }

          case 'guilds': {
            let text =
              `The bot is now in ${client.guilds.cache.size} guilds:\n` +
              '```\n' +
              [...client.guilds.cache.values()]
                .sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime())
                .join(', ') +
              '\n```'
            if (text.length > 2000) text = text.slice(0, 2000 - 7) + '...\n```'

            await int.reply(text)
            break
          }

          case 'reload': {
            const dateStr = require('../../utils/reloadme.json')?.date,
              result = dateStr ? new Date(dateStr).toString() : '???'
            await int.reply(`Last reload: ${result}`)
            break
          }

          default: {
            throw new Error(`Unexpected stat option: ${stat}`)
          }
        }
        break
      }

      case 'off': {
        await int.reply('Turning off...')

        client.destroy()
        process.exit()
      }

      // eslint-disable-next-line no-fallthrough
      case 'restart': {
        await int.reply('Restarting...')

        fs.writeFileSync(
          path.join(__dirname, '../../utils/reloadme.json'),
          JSON.stringify({ date: new Date() })
        )

        break
      }

      case 'poststats': {
        await int.reply('Posting stats...')

        try {
          const stats = await poster.post()
          await int.editReply(
            `Stats successfully posted to ${
              stats instanceof Array
                ? `\`${stats.length}\` service${stats.length == 1 ? '' : 's'}`
                : '`1` service'
            } :white_check_mark:`
          )
        } catch (e) {
          await int.editReply("Couldn't post stats:\n```\n" + e + '\n```')
        }
        break
      }

      default: {
        throw new Error(
          `Unexpected dev subcommand: ${int.options.getSubcommand()}`
        )
      }
    }
  }
}
