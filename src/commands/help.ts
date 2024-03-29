import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js'
import { docsURL } from '../core/app'
import { CommandOptions, SlashCommandBuilder } from '../utils/commands'

const msg = `
Each slash command has its own description and arguments, which should contain all the relevant info.
If you need any help with the bot commands, you can check out the online docs at the link below, or ask in the support guild (use \`/support\` to get the invite).
`

export const command: CommandOptions = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show some resources to help you use the bot.'),

  async run(int) {
    return int.reply({
      content: msg.trim(),
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel('Online docs')
            .setURL(docsURL)
        )
      ]
    })
  }
}
