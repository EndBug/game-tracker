import { client } from '../../core/app'
import { Command } from '../../utils/command'
import { Message } from 'discord.js'
import { provider } from '../../utils/provider'
import { APIUtil, APIKey } from '../../utils/api'
import { enforceType } from '../../utils/utils'

export default class DevStatsCMD extends Command {
  constructor() {
    super({
      name: 'devstats',
      description: 'Gives some usefult stats about the bot.',
      args: [{
        key: 'mode',
        prompt: 'One of: servers/guilds, database/db',
        validate: str => ['servers', 'guilds', 'database', 'db'].includes(str)
      }],
      ownerOnly: true
    })
  }

  run(msg: Message, [mode]: [string]) {
    if (['servers', 'guilds'].includes(mode)) {
      let text = `The bot is now in ${client.guilds.cache.size} guilds:\n`
        + '```\n'
        + client.guilds.cache.array()
          .sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime())
          .join(', ')
        + '\n```'
      if (text.length > 2000)
        text = text.substr(0, 2000 - 7) + '...\n```'

      return msg.channel.send(text)
    } else if (['database', 'db'].includes(mode)) {
      const stats = provider.stats()

      let str = 'Here is the current database:\n'
      for (const key in stats) {
        if (enforceType<APIKey>(key))
          str += `- ${APIUtil.getAPIName(key)} (${stats[key]}):\n`
      }

      return msg.channel.send(str)
    }
  }
}
