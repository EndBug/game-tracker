import * as Commando from 'discord.js-commando'
import { APIUtil } from '../../core/app'
import { DMChannel, TextChannel, MessageReaction, User } from 'discord.js'

export default class SampleCMD extends Commando.Command {
  constructor(client: Commando.CommandoClient) {
    super(client, {
      name: 'erase-data',
      aliases: ['data-erase', 'delete-data', 'data-delete', 'forgetmealready'],
      group: 'data',
      memberName: 'erase-data',
      description: 'Deletes all of your data.',
      details: 'You\'ll be prompted before any data gets deleted. It does not include temporary caching; that data is automatically deleted anyways and doesn\'t get stored in the database.',
      guildOnly: false,
      ownerOnly: false
    })
  }

  // @ts-ignore
  async run(msg: Commando.CommandoMessage) {
    if (Object.keys(APIUtil.find(msg.author)).length == 0) return msg.reply('There\'s no stored data about you.')

    const { channel } = msg
    const perm1 = channel instanceof DMChannel || channel.permissionsFor(this.client.user).has('ADD_REACTIONS')
    const perm2 = channel instanceof TextChannel && channel.permissionsFor(this.client.user).has('MANAGE_MESSAGES')

    let main = await msg.reply('Are you sure you want to delete all of your stored data? All of your account will be unlinked from this bot.\nReact to confirm (✅) or cancel (❌) the command.\nThis command will expire in 30 seconds.')
    if (main instanceof Array) main = main[0]
    if (perm1) {
      await main.react('✅')
      await main.react('❌')
    }
    const filter = (reaction: MessageReaction, user: User) => {
      if (!['✅', '❌'].includes(reaction.emoji.name)) {
        if (perm2) reaction.remove(user)
        return false
      }
      return user.id == msg.author.id
    }
    const coll = await main.awaitReactions(filter, { max: 1, time: 30000 })
    if (perm2) main.clearReactions()
    else main.reactions.forEach(r => {
      if (r.me) r.remove()
    })
    if (coll.size == 0) return main.edit('Command expired.')
    else {
      const reaction = coll.first().emoji.name
      if (reaction == '❌') return main.edit('Command canceled.')
      else if (reaction == '✅') {
        await main.edit('Command confirmed.')
        const res = APIUtil.erase(msg.author)
        if (res.length == 0) return msg.reply('There was no data about you.')
        const str = res.length > 1 ? ' has' : `s (${res.length}) have`
        return msg.reply(`Your account${str} been unlinked from this bot.`)
      }
    }
  }
}
