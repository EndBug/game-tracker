import { links } from '../core/app'
import { CommandOptions, SlashCommandBuilder } from '../utils/commands'

const message = `
Thank you for choosing Game Tracker!
Please note that the permissions required in the invite are important, and that without them the bot could not work properly.
Click here to invite the bot: ${links.invite}
`.trim()

export const command: CommandOptions = {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Gives you the link to add the bot to your guild.'),

  async run(int) {
    return int.reply(message)
  }
}
