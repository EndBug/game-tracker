import * as Commando from 'discord.js-commando';
import { RichEmbed } from 'discord.js';
import { getVotes } from '../../utils/dbl_stats';

export default class VoteCMD extends Commando.Command {
  constructor(client: Commando.CommandoClient) {
    super(client, {
      name: 'vote',
      group: 'dbl',
      memberName: 'vote',
      description: 'Gives you instructions on how to vote for the bot.',
      guildOnly: false,
      ownerOnly: false
    });
  }

  //@ts-ignore
  async run(msg: Commando.CommandoMessage) {
    const embed = new RichEmbed()
      .addField('Voting', 'This bot is listed in [Discord Bots List](https://discordbots.org), a popular website that shows nearly every public bot for Discord servers. In order to get more views and reach more people the bot needs to get votes (they get reset monthly).')
      .addField('How to vote', 'Head to the [vote page](https://discordbots.org/bot/475421235950518292/vote) and click the \'Vote\' button; if you\'re not already logged in with Discord it\'ll ask you that first.')
      .addField('Reminders', 'If you really care about the bot you can also set reminders by clicking the \'Yes, remind me\' button: that will send notifications to your browser evey time you\'re able to vote again (12 hours after one vote). If you prefer, you can also get daily notifications by checking the \'Remind me daily\' box.')
      .setTimestamp();

    // const votes = await getVotes();
    // if (votes instanceof Array) embed.addField('Current votes', votes.length);

    msg.say({ embed });
  }
}