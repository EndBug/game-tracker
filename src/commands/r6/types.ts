import { Command, CommandoClient } from 'discord.js-commando' // eslint-disable-line no-unused-vars
import { getConfig } from './r6'

export default class R6TypesWiki extends Command {
  constructor(client: CommandoClient) {
    super(client, getConfig('types', {
      description: 'Displays types stats for the given player.',
      examples: {
        'Snake_Nade': 'Displays types stats for `Snake_Nade` by searching the user in the `uplay` category.',
        'Saunshi xbl': 'Displays types stats for `Saunshi` by searching the user in the `xbl` category.',
        '@YoMama': 'Displays types stats for the mentioned user, if they linked their account.',
        '': 'Displays your types stats, if you linked your account.'
      },
    }))
  }
}
