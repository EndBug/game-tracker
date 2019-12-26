import * as Commando from 'discord.js-commando'

import { poster, available } from '../../utils/stats_poster'

export default class PostStatsCMD extends Commando.Command {
  constructor(client: Commando.CommandoClient) {
    super(client, {
      name: 'poststats',
      aliases: ['postdblstats'],
      group: 'dbl',
      memberName: 'poststats',
      description: 'Manually posts bot stats to Registered services.',
      guildOnly: false,
      ownerOnly: true,
      hidden: available
    })
  }

  // @ts-ignore
  async run(msg: Commando.CommandoMessage) {
    var rep = await msg.say('Posting stats...')
    if (rep instanceof Array) rep = rep[0]

    try {
      const stats = await poster.post()
      rep.edit(`Stats successfully posted to ${stats instanceof Array ? `\`${stats.length}\` service${stats.length == 1 ? '' : 's'}` : '`1` service'} :white_check_mark:`)
    } catch (e) {
      rep.edit('Couldn\'t post stats:\n```\n' + e + '\n```')
    }
  }
}
