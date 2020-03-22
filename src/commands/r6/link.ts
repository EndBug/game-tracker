import { getConfig } from './r6'
import { Command } from '../../utils/command'

export default class R6LinkWiki extends Command {
  constructor() {
    super(getConfig('link', {
      description: 'Saves your account in the bot\'s database.',
      details: 'You just need to enter your username; if you are playing on Xbox or PlayStation, add the platform after it (the default one is `uplay`)',
      examples: {
        'Snake_Nade': 'Links `Snake_Nade` by searching the user in the `uplay` category.',
        'Saunshi xbl': 'Links `Saunshi` by searching the user in the `xbl` category.',
        '': 'Displays your current linked account.'
      }
    }))
  }
}
