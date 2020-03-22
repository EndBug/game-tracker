import { Command } from '../../utils/command'

export default class OWUnlinkWiki extends Command {
  constructor() {
    super({
      name: 'ow unlink',
      aliases: ['overwatch unlink'],
      description: 'Deletes your battletag/GamerTag/PSN ID from the bot\'s database.',
      examples: [
        '`ow unlink` - Unlinks your account.'
      ],
      guildOnly: true
    })
  }
}
