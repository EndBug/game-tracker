import { getConfig } from './r6'
import { Command } from '../../utils/command'

export default class R6UnlinkWiki extends Command {
  constructor() {
    super(
      getConfig('unlink', {
        description: "Deletes your account from the bot's database.",
        examples: {
          '': 'Unlinks your account.'
        }
      })
    )
  }
}
