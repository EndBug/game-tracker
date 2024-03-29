import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ComponentType
} from 'discord.js'
import { APIUtil } from '../utils/api'
import { CommandOptions, SlashCommandBuilder } from '../utils/commands'
import { uuid } from '../utils/utils'

export const command: CommandOptions = {
  data: new SlashCommandBuilder()
    .setName('data')
    .setDescription('Allows you to see and managed your stored info.')
    .addSubcommand((s) =>
      s
        .setName('show')
        .setDescription('Shows you all the data the bot stored about you.')
    )
    .addSubcommand((s) =>
      s
        .setName('erase')
        .setDescription(
          "Deletes all of your data. You'll recevie a prompt before the data is actually deleted."
        )
    ),

  async run(int) {
    switch (int.options.getSubcommand(true)) {
      case 'show': {
        const res = await APIUtil.findAll(int.user)
        let text: string

        if (Object.keys(res).length > 0) {
          text = 'This is your data:\n```'
          for (const key in res) {
            text += `\n${key}: ${JSON.stringify(res[key])}`
          }
          text +=
            "\n```If you want to unlink one of these accounts search for the 'unlink' command for that game (you can use `help` to find it).\nTo delete all of your data, run `erase-data`"
        } else text = "There's no data about you in the database."

        await int.reply({ content: text, ephemeral: true })
        break
      }

      case 'erase': {
        if (int.channel.type != ChannelType.GuildText) return

        if (Object.keys(await APIUtil.findAll(int.user)).length == 0)
          return int.reply({
            content: "There's no stored data about you.",
            ephemeral: true
          })

        const ids = {
          confirm: uuid(),
          cancel: uuid()
        }
        const buttons = {
          confirm: new ButtonBuilder()
            .setCustomId(ids.confirm)
            .setStyle(ButtonStyle.Success)
            .setLabel('Confirm'),
          cancel: new ButtonBuilder()
            .setCustomId(ids.cancel)
            .setStyle(ButtonStyle.Danger)
            .setLabel('Cancel')
        }

        await int.reply({
          content:
            'Are you sure you want to delete all of your stored data? All of your account will be unlinked from this bot.\nConfirm within 30 seconds to erase your data.',
          ephemeral: true,
          components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(
              buttons.confirm,
              buttons.cancel
            )
          ]
        })

        const collector =
          int.channel.createMessageComponentCollector<ComponentType.Button>({
            time: 30000,
            filter: (i) =>
              i.user.id == int.user.id &&
              [ids.confirm, ids.cancel].includes(i.customId)
          })

        collector.on('collect', async (i) => {
          if (i.customId == ids.cancel) {
            await i.reply({ content: 'Command canceled.', ephemeral: true })
            return collector.stop()
          }

          if (i.customId == ids.confirm) {
            const erased = await APIUtil.eraseAll(int.user)

            if (erased.length == 0) {
              await i.reply({
                content: '✅ There was no data about you.',
                ephemeral: true
              })
              return collector.stop()
            }

            const str = erased.length > 1 ? ' has' : `s (${erased.length}) have`
            await i.reply({
              content: `✅ Your account${str} been unlinked from this bot.`,
              ephemeral: true
            })
            return collector.stop()
          }
        })

        collector.on('end', () => {
          int.editReply({
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(
                buttons.confirm.setDisabled(true),
                buttons.cancel.setDisabled(true)
              )
            ]
          })
        })

        break
      }

      default: {
        throw new Error(
          `Unexpected data subcommand: ${int.options.getSubcommand()}`
        )
      }
    }
  }
}
