import fs from 'fs'
import path from 'path'
import { Message } from 'discord.js-light'

import { owner } from '../../core/app'
import { Command } from '../../utils/command'
export default class RestartCMD extends Command {
  constructor() {
    super({
      name: 'restart',
      aliases: ['rs'],
      description:
        'Makes a backup of the database (if backup is available) and restarts the bot.',
      guildOnly: false
    })
  }

  async run(msg: Message) {
    await msg.channel.send('Restarting...')

    fs.writeFileSync(
      path.join(__dirname, '../../utils/reloadme.json'),
      JSON.stringify({ date: new Date() })
    )
  }

  hasPermission(msg: Message) {
    if (msg.author.id == owner.id) return true
    else return 'This command can only be executed by the bot owner.'
  }
}
