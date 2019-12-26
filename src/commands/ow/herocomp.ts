import * as Commando from 'discord.js-commando'

export default class OWHeroCompWiki extends Commando.Command {
  constructor(client: Commando.CommandoClient) {
    super(client, {
      name: 'ow herocomp',
      aliases: ['overwatch herocomp'],
      group: 'ow',
      memberName: 'ow herocomp',
      description: 'Displays competitive hero stats for the targeted user.',
      details: 'To specify the player, enter their battletag/GamerTag/PSN ID. You can also mention them and, if they linked their account to this bot, it will display their stats. If left blank, the bot will try to show your profile (if you `ow link`ed it). Specify the hero after the player. If left blank, it will display the hero you have played for longer. Some nicknames are allowed too: `hammond` (Wrecking Ball), `monkey` (Winston), `zen` (Zenyatta), and many others...',
      format: '{battletag#1234 | GamerTag | PSN ID | @mention} [platform: (pc | xbl | psn)] [hero]',
      examples: [
        '`ow herocomp EeveeA#1716 genji` - Displays competitive stats for `EeveeA#1716` by searching them in the PC category, shows Genji.',
        '`ow herocomp FANKDA psn monkey` - Displays competitive stats for `FANKDA` by searching them in the PlayStation Network, shows Winston.',
        '`ow herocomp @YoMama` - Displays competitive stats for the mentioned user, if their account is linked, shows their most played hero.',
        '`ow herocomp` - If your account is linked, displays your overwatch stats and shows your most played hero.'
      ],
      guildOnly: true
    })
  }
}
