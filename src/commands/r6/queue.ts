import { Command, CommandoClient } from 'discord.js-commando' // eslint-disable-line no-unused-vars
import { getConfig } from './r6'

export default class R6QueueWiki extends Command {
  constructor(client: CommandoClient) {
    super(client, getConfig('queue', {
      description: 'Displays queue stats for the given player.',
      examples: {
        'Snake_Nade': 'Displays queue stats for `Snake_Nade` by searching the user in the `uplay` category.',
        'Saunshi xbl': 'Displays queue stats for `Saunshi` by searching the user in the `xbl` category.',
        '@YoMama': 'Displays queue stats for the mentioned user, if they linked their account.',
        '': 'Displays your queue stats, if you linked your account.'
      },
    }))
  }
}
