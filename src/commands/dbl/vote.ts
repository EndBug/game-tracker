import * as Commando from 'discord.js-commando';
import { RichEmbed } from 'discord.js';

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

  // @ts-ignore
  async run(msg: Commando.CommandoMessage) {
    const embed = new RichEmbed()
      .addField('Voting', 'This bot is listed in on a handful of websites that show nearly every public bot for Discord servers. In order to get more views and reach more people the bot needs to get votes (they get reset monthly).')
      .addField('How to vote', 'Head to the voting page for each service and click the vote/upvote button; it\'s possible that the website will ask you to log into Discord before you\'re able to vote.')
      .addField('Voting links', `[DiscordBots.org](https://discordbots.org/bot/475421235950518292/vote)
      [BotsForDiscord.com](https://botsfordiscord.com/bot/475421235950518292/vote)
      [Bots.OnDiscord.xyz](https://bots.ondiscord.xyz/bots/475421235950518292)
      [DiscordBotList.com](https://discordbotlist.com/bots/475421235950518292/upvote)
      [DivineDiscordBots.com](https://divinediscordbots.com/bot/475421235950518292/vote)
      `).setTimestamp();

    msg.say({ embed });
  }
}