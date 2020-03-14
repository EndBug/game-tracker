import * as Commando from 'discord.js-commando'

export default class OWLinkWiki extends Commando.Command {
  constructor(client: Commando.CommandoClient) {
    super(client, {
      name: 'ow link',
      aliases: ['overwatch link'],
      group: 'ow',
      memberName: 'ow link',
      description: 'Saves your battletag in the bot\'s database.',
      details: 'Just enter your battletag/GamerTag/PSN ID. If you are on Xbox or PlayStation, specify the platform after it (default one is `pc`)\nTo go to the online docs for this command, go to <https://game-tracker.js.org/#/ow/overwatch?id=ow-link>',
      format: '{battletag#1234 | GamerTag | PSN ID} [platform: (pc | xbl | psn)]',
      examples: [
        '`ow link EeveeA#1716` - Links `EeveeA#1716` by searching in the PC category.',
        '`ow link FANKDA psn` - Links `FANKDA` by searching in the PlayStation Network.',
        '`ow link` - Displays your current linked account.'
      ],
      guildOnly: true
    })
  }
}
