import { getConfig } from './r6'
import { Command } from '../../utils/command'

export default class R6OPWiki extends Command {
  constructor() {
    super(getConfig('op', {
      description: 'Displays operator stats for the given operator.',
      details: 'Specify the operator to show by writing their name. Every operator can be written in lowercase with no spaces or dots, e.g.: "Recruit SAS" = "recruitsas".\nYou can find codes for supported operators here: <https://game-tracker.js.org/#/r6/r6_names?id=operators>',
      examples: {
        'recruitsas Snake_Nade': 'Displays Recruit SAS stats for `Snake_Nade` by searching the user in the `uplay` category.',
        'gridlock Saunshi xbl': 'Displays Gridlock stats for `Saunshi` by searching the user in the `xbl` category.',
        'nokk @YoMama': 'Displays Nøkk stats for the mentioned user, if they linked their account.',
        'frost': 'Displays your Frost stats, if you linked your account.'
      },
      extra: 'operator'
    }))
  }
}
