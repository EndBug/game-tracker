import { getConfig } from './r6'
import { Command } from '../../utils/command'

export default class R6TypesWiki extends Command {
  constructor() {
    super(
      getConfig('types', {
        description: 'Displays types stats for the given player.',
        examples: {
          BandltlsMyMaln:
            'Displays types stats for `BandltlsMyMaln` by searching the user in the `uplay` category.',
          'Truman xbl':
            'Displays types stats for `Truman` by searching the user in the `xbl` category.',
          '@DiscordUser':
            'Displays types stats for the mentioned user, if they linked their account.',
          '': 'Displays your types stats, if you linked your account.'
        }
      })
    )
  }
}
