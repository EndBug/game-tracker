import { owner } from '../../core/app'
import { Command } from '../../utils/command'
import { Message } from 'discord.js-light'

export default class OffCMD extends Command {
  constructor() {
    super({
      name: 'off',
      aliases: ['shutdown'],
      description:
        'Makes a backup of the database (if backup is available) and turns off the bot.',
      guildOnly: false
    })
  }

  async run(msg: Message) {
    await msg.channel.send('Turning off...')

    this.client.destroy()
    process.exit()
  }

  hasPermission(msg: Message) {
    if (msg.author.id == owner.id) return true
    else return 'This command can only be executed by the bot owner.'
  }
}
