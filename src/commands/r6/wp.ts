import { getConfig } from './r6'
import { Command } from '../../utils/command'

export default class R6WPWiki extends Command {
  constructor() {
    super(
      getConfig('wp', {
        description:
          'Displays weapon stats for the given weapon or weapon category.',
        details:
          'Specify the weapon to show by writing its name. Every weapon name or category can be written in lowercase and with `-` instead of spaces, e.g.: "Super Shorty" = "super-shorty".\nYou can find codes for supported weapons and weapon types here: <https://game-tracker.js.org/#/r6/r6_names?id=weapon-categories>',
        examples: {
          'camrs BandltlsMyMaln':
            'Displays CAMRS stats for `BandltlsMyMaln` by searching the user in the `uplay` category.',
          'assault Truman xbl':
            'Displays assault weapons stats for `Truman` by searching the user in the `xbl` category.',
          'L85A2 @DiscordUser':
            'Displays L85A2 stats for the mentioned user, if they linked their account.',
          pistol:
            'Displays your pistol weapons stats, if you linked your account.'
        },
        extra: 'weaponName | weaponType'
      })
    )
  }
}
