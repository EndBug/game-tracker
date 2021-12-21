import { owner, roles } from '../../core/app'
import * as backup from '../../core/backup'
import { Command } from '../../utils/command'
import { Message } from 'discord.js-light'

export default class BackupCMD extends Command {
  constructor() {
    super({
      name: 'backup',
      aliases: ['upload'],
      description: 'Forces the bot to backup the settings database',
      details: 'One backup is issued after every crash.',
      guildOnly: true
    })
  }

  async run(msg: Message) {
    if (!backup.available)
      return msg.reply('There is no backup token, please check your .env file.')

    let res = await msg.channel.send('Uploading backup...')
    if (res instanceof Array) res = res[0]
    return backup
      .upload('Manual')
      .then(() => {
        if (res instanceof Array) res = res[0]
        return res.edit('Backup uploaded :white_check_mark:')
      })
      .catch((err) => {
        if (res instanceof Array) res = res[0]
        return res.edit(`Error while uploading backup:\n\`\`\`\n${err}\n\`\`\``)
      })
  }

  hasPermission(msg: Message) {
    if (msg.author == owner) return true
    const member = msg.member
    if (member) return member.roles.cache.has(roles.dev.id)
    else
      return "Can't define your permissions, please contact the owner of the server."
  }
}
