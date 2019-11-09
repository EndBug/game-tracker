import { Command, CommandoClient } from 'discord.js-commando'; // eslint-disable-line no-unused-vars
import { getConfig } from './r6';

export default class R6GeneralWiki extends Command {
  constructor(client: CommandoClient) {
    super(client, getConfig('general', {
      description: 'Displays general stats for the given play types.',
      details: 'Specify the play type to show by writing either `pvp`, `pve` or `all`.',
      examples: {
        'all Snake_Nade': 'Displays general PvP and PvE stats fpr `Snake_Nade` by searching the user in the `uplay` category.'
      },
      extra: 'playType'
    }));
  }
}
