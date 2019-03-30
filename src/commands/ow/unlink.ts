import * as Commando from 'discord.js-commando';

export default class OWUnlinkWiki extends Commando.Command {
  constructor(client: Commando.CommandoClient) {
    super(client, {
      name: 'ow unlink',
      aliases: ['overwatch unlink'],
      group: 'ow',
      memberName: 'ow unlink',
      description: 'Deletes your battletag/GamerTag/PSN ID from the bot\'s database.',
      examples: [
        '`ow unlink` - Unlinks your account.'
      ],
      guildOnly: true
    });
  }
}
