import { links, owner } from '../core/app'
import { CommandOptions, SlashCommandBuilder } from '../utils/commands'
import { getSupportInvite } from '../utils/utils'

export const command: CommandOptions = {
  data: new SlashCommandBuilder()
    .setName('support')
    .setDescription(
      'Gives you the invite to join the official Game Tracker support server.'
    ),

  async run(int) {
    let invite = await getSupportInvite()
    if (!invite) {
      owner.send(
        `Problem with invite creation: getSupportInvite() == ${invite}`
      )
      invite = links.support
      if (!invite)
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
