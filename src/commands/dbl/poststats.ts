import { poster } from '../../utils/stats_poster'
import { Command } from '../../utils/command'
import { Message } from 'discord.js-light'

export default class PostStatsCMD extends Command {
  constructor() {
    super({
      name: 'poststats',
      aliases: ['postdblstats'],
      description: 'Manually posts bot stats to Registered services.',
      ownerOnly: true
    })
  }

  async run(msg: Message) {
    var rep = await msg.channel.send('Posting stats...')
    if (rep instanceof Array) rep = rep[0]

    try {
      const stats = await poster.post()
      return rep.edit(
        `Stats successfully posted to ${
          stats instanceof Array
            ? `\`${stats.length}\` service${stats.length == 1 ? '' : 's'}`
            : '`1` service'
        } :white_check_mark:`
      )
    } catch (e) {
      return rep.edit("Couldn't post stats:\n```\n" + e + '\n```')
    }
  }
}
