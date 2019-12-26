import { Command, CommandoClient } from 'discord.js-commando' // eslint-disable-line no-unused-vars
import { getConfig } from './r6'
import { constants } from '../../apis/rainbow'

export default class R6WPWiki extends Command {
  constructor(client: CommandoClient) {
    super(client, getConfig('wp', {
      description: 'Displays weapon stats for the given weapon.',
      details: `Specify the weapon to show by writing its name. Supported weapon names are: ${constants.WEAPONS.map(wp => '`' + wp.name + '`').join(', ')}.`,
      examples: { // REDO WEAPON NAME CHECKING
        'all Snake_Nade': 'Displays general PvP and PvE stats for `Snake_Nade` by searching the user in the `uplay` category.',
        'pvp Saunshi xbl': 'Displays general PvP stats for `Saunshi` by searching the user in the `xbl` category.',
        'all @YoMama': 'Displays general PvP and PvE stats for the mentioned user, if they linked their account.',
        'all': 'Displays your general PvP and PvE stats, if you linked your account.'
      },
      extra: 'playType'
    }))
  }
}
