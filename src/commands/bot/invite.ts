import { links } from '../../core/app'
import { Command } from '../../utils/command'
import { Message } from 'discord.js'

export default class InviteCMD extends Command {
  constructor() {
    super({
      name: 'invite',
      aliases: ['inviteme', 'add', 'addme', 'invitelink'],
      description: 'Gives you the link to add the bot to your guild.'
    })
  }

  run(msg: Message) {
    return msg.channel.send(`Thank you for choosing Game Tracker!\nPlease note that the permissions required in the invite are important, and that without them the bot could not work properly.\nClick here to invite the bot: ${links.invite}`)
  }
}
