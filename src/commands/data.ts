import { MessageActionRow, MessageButton } from 'discord.js'
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
        .setDescription('Shows you all the data the the bot stored about you.')
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
        const res = APIUtil.findAll(int.user)
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
        if (Object.keys(APIUtil.findAll(int.user)).length == 0)
          return int.reply({
            content: "There's no stored data about you.",
            ephemeral: true
          })

        const buttons = {
          confirm: new MessageButton()
            .setCustomId(uuid())
            .setStyle('SUCCESS')
            .setLabel('Confirm'),
          cancel: new MessageButton()
            .setCustomId(uuid())
            .setStyle('DANGER')
            .setLabel('Cancel')
        }

        await int.reply({
          content:
            'Are you sure you want to delete all of your stored data? All of your account will be unlinked from this bot.\nConfirm within 30 seconds to erase your data.',
          ephemeral: true,
          components: [
            new MessageActionRow().addComponents(
              buttons.confirm,
              buttons.cancel
            )
          ]
        })

        const collector = int.channel.createMessageComponentCollector({
          time: 30000,
          filter: (i) =>
            i.user.id == int.user.id &&
            [buttons.confirm.customId, buttons.cancel.customId].includes(
              i.customId
            )
        })

        collector.on('collect', async (i) => {
          if (i.customId == buttons.cancel.customId) {
            await i.editReply('Command canceled.')
            return collector.stop()
          }

          if (i.customId == buttons.confirm.customId) {
            const erased = await APIUtil.eraseAll(int.user)

            if (erased.length == 0) {
              await i.editReply('✅ There was no data about you.')
              return collector.stop()
            }

            const str = erased.length > 1 ? ' has' : `s (${erased.length}) have`
            await int.editReply(
              `✅ Your account${str} been unlinked from this bot.`
            )
            return collector.stop()
          }
        })

        collector.on('end', () => {
          int.editReply({
            components: [
              new MessageActionRow().addComponents(
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
