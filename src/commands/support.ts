import { links, owner } from '../core/app'
import { CommandOptions, SlashCommandBuilder } from '../utils/commands'

export const command: CommandOptions = {
  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription(
      'Gives you the invite to join the official Game Tracker support server.'
    ),

  async run(int) {
    const invite = links.support

    if (!invite) {
      owner.send('Support invite link is missing, fix ASAP!')
      return int.reply({
        content:
          'Sorry, this command is temporarily unavailable, please retry later.\nIronic, huh?',
        ephemeral: true
      })
    }

    return int.reply(
      `Thank you for choosing Game Tracker!\nYou can enter in the support guild using this invite: ${invite}`
    )
  }
}
