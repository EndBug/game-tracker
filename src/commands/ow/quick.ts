import * as Commando from 'discord.js-commando';

export default class OWQuickWiki extends Commando.Command {
  constructor(client: Commando.CommandoClient) {
    super(client, {
      name: 'ow quick',
      aliases: ['overwatch quick'],
      group: 'ow',
      memberName: 'ow quick',
      description: 'Displays quickplay stats for the targeted user.',
      details: 'To specify the player, enter their battletag/GamerTag/PSN ID. You can also mention them and, if they linked their account to this bot, it will display their stats. If left blank, the bot will try to show your profile (if you `ow link`ed it).',
      format: '{battletag#1234 | GamerTag | PSN ID | @mention} [platform: (pc | xbl | psn)]',
      examples: [
        '`ow quick EeveeA#1716` - Displays quickplay stats for `EeveeA#1716` by searching them in the PC category.',
        '`ow quick FANKDA psn` - Displays quickplay stats for `FANKDA` by searching them in the PlayStation Network.',
        '`ow quick @YoMama` - Displays quickplay stats for the mentioned user, if their account is linked.',
        '`ow quick` - If your account is linked, displays your overwatch stats.'
      ],
      guildOnly: true
    });
  }
}
