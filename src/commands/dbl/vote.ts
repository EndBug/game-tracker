import { MessageEmbed, Message } from 'discord.js'
import { Command } from '../../utils/command'

export default class VoteCMD extends Command {
  constructor() {
    super({
      name: 'vote',
      description: 'Gives you instructions on how to vote for the bot.'
    })
  }

  async run(msg: Message) {
    const embed = new MessageEmbed()
      .addField(
        'Voting',
        'This bot is listed in on a handful of websites that show nearly every public bot for Discord servers. In order to get more views and reach more people the bot needs to get votes (they get reset monthly).'
      )
      .addField(
        'How to vote',
        "Head to the voting page for each service and click the vote/upvote button; it's possible that the website will ask you to log into Discord before you're able to vote."
      )
      .addField(
        'Voting links',
        `[DiscordBots.org](https://discordbots.org/bot/475421235950518292/vote)
      [BotsForDiscord.com](https://botsfordiscord.com/bot/475421235950518292/vote)
      [Bots.OnDiscord.xyz](https://bots.ondiscord.xyz/bots/475421235950518292)
      [DiscordBotList.com](https://discordbotlist.com/bots/475421235950518292/upvote)
      [DivineDiscordBots.com](https://divinediscordbots.com/bot/475421235950518292/vote)
      `
      )
      .setTimestamp()

    return msg.channel.send({ embed })
  }
}
