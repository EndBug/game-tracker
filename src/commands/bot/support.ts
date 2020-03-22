import { getSupportInvite } from '../../utils/utils'
import { owner } from '../../core/app'
import { Command } from '../../utils/command'
import { Message } from 'discord.js'

export default class SupportCMD extends Command {
  constructor() {
    super({
      name: 'support',
      aliases: ['supportguild', 'supportserver', 'feedback', 'issue'],
      description: 'Gives you the invite to enter in the official Game Tracker support server.'
    })
  }

  async run(msg: Message) {
    const invite = await getSupportInvite()
    if (!invite) {
      owner.send(`Problem with invite creation: ${invite}`)
      return msg.channel.send('Sorry, this command is temporarily unavailable, please retry later.\nIronic, huh?')
    } else return msg.channel.send(`Thank you for choosing Game Tracker!\nYou can enter in the support guild through this invite: ${invite}`)
  }
}
