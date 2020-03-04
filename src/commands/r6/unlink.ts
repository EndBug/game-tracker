import { Command, CommandoClient } from 'discord.js-commando' // eslint-disable-line no-unused-vars
import { getConfig } from './r6'

export default class R6UnlinkWiki extends Command {
  constructor(client: CommandoClient) {
    super(client, getConfig('unlink', {
      description: 'Deletes your account from the bot\'s database.',
      examples: {
        '': 'Unlinks your account.'
      },
    }))
  }
}
