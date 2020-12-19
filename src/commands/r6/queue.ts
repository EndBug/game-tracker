import { getConfig } from './r6'
import { Command } from '../../utils/command'

export default class R6QueueWiki extends Command {
  constructor() {
    super(
      getConfig('queue', {
        description: 'Displays queue stats for the given player.',
        examples: {
          BandltlsMyMaln:
            'Displays queue stats for `BandltlsMyMaln` by searching the user in the `uplay` category.',
          'Truman xbl':
            'Displays queue stats for `Truman` by searching the user in the `xbl` category.',
          '@DiscordUser':
            'Displays queue stats for the mentioned user, if they linked their account.',
          '': 'Displays your queue stats, if you linked your account.'
        }
      })
    )
  }
}
