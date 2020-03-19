import { oneLine } from 'common-tags'
import { Command } from '../../utils/command'
import { Message } from 'discord.js'

export default class PingCommand extends Command {
  constructor() {
    super({
      name: 'ping',
      description: 'Checks the bot\'s ping to the Discord server.',
      ownerOnly: true
    })
  }

  async run(msg: Message) {
    const pingMsg = await msg.reply('Pinging...')
    return pingMsg.edit(oneLine`
			${msg.channel.type !== 'dm' ? `${msg.author},` : ''}
			Pong! The message round-trip took ${
      (pingMsg.editedTimestamp || pingMsg.createdTimestamp) - (msg.editedTimestamp || msg.createdTimestamp)
      }ms.
			${this.client.ws.ping ? `The heartbeat ping is ${Math.round(this.client.ws.ping)}ms.` : ''}
		`)
  }
}
