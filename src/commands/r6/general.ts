import { getConfig } from './r6'
import { Command } from '../../utils/command'

export default class R6GeneralWiki extends Command {
  constructor() {
    super(getConfig('general', {
      description: 'Displays general stats for the given play types.',
      details: 'Specify the play type to show by writing either `pvp`, `pve` or `all`.',
      examples: {
        'all Snake_Nade': 'Displays general PvP and PvE stats for `Snake_Nade` by searching the user in the `uplay` category.',
        'pvp Saunshi xbl': 'Displays general PvP stats for `Saunshi` by searching the user in the `xbl` category.',
        'all @YoMama': 'Displays general PvP and PvE stats for the mentioned user, if they linked their account.',
        'all': 'Displays your general PvP and PvE stats, if you linked your account.'
      },
      extra: 'playType'
    }))
  }
}
