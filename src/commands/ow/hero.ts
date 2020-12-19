import { Command } from '../../utils/command'
import { getDocsLink } from '../../utils/utils'

export default class OWHeroWiki extends Command {
  constructor() {
    super({
      name: 'ow hero',
      aliases: ['overwatch hero'],
      description: 'Displays quickplay hero stats for the targeted user.',
      details: `To specify the player, enter their battletag/GamerTag/PSN ID. You can also mention them and, if they linked their account to this bot, it will display their stats. If left blank, the bot will try to show your profile (if you \`ow link\`ed it).\nSpecify the hero after the player. If left blank, it will display the hero you have played for longer. You can find an updated list of possible names here: <${getDocsLink(
        'ow/ow_heroes'
      )}>`,
      format:
        '{battletag#1234 | GamerTag | PSN ID | @mention} [platform: (pc | xbl | psn)] [hero]',
      examples: [
        '`ow hero EeveeA#1716 genji` - Displays quickplay stats for `EeveeA#1716` by searching them in the PC category, shows Genji.',
        '`ow hero FANKDA psn monkey` - Displays quickplay stats for `FANKDA` by searching them in the PlayStation Network, shows Winston.',
        '`ow hero @DiscordUser` - Displays quickplay stats for the mentioned user, if their account is linked, shows their most played hero.',
        '`ow hero` - If your account is linked, displays your overwatch stats and shows your most played hero.'
      ],
      guildOnly: true
    })
  }
}
