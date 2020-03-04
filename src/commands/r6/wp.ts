import { Command, CommandoClient } from 'discord.js-commando' // eslint-disable-line no-unused-vars
import { getConfig } from './r6'

export default class R6WPWiki extends Command {
  constructor(client: CommandoClient) {
    super(client, getConfig('wp', {
      description: 'Displays weapon stats for the given weapon or weapon category.',
      details: 'Specify the weapon to show by writing its name. Every weapon name or category can be written in lowercase and with `-` instead of spaces, e.g.: "Super Shorty" = "super-shorty".\nYou can find codes for supported weapons and weapon types here: <https://github.com/EndBug/game-tracker/blob/master/doc/r6/R6_NAMES.md#weapon-categories>',
      examples: {
        'camrs Snake_Nade': 'Displays CAMRS stats for `Snake_Nade` by searching the user in the `uplay` category.',
        'assault Saunshi xbl': 'Displays assault weapons stats for `Saunshi` by searching the user in the `xbl` category.',
        'L85A2 @YoMama': 'Displays L85A2 stats for the mentioned user, if they linked their account.',
        'pistol': 'Displays your pistol weapons stats, if you linked your account.'
      },
      extra: 'weaponName | weaponType'
    }))
  }
}
