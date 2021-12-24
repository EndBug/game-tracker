import { MessageReaction, User, Message } from 'discord.js-light'
import { Command } from '../../utils/command'
import { APIUtil } from '../../utils/api'
import { client } from '../../core/app'

export default class EraseDataCMD extends Command {
  constructor() {
    super({
      name: 'erase-data',
      aliases: ['data-erase', 'delete-data', 'data-delete', 'forgetmealready'],
      description: 'Deletes all of your data.',
      details:
        "You'll be prompted before any data gets deleted. It does not include temporary caching; that data is automatically deleted anyways and doesn't get stored in the database."
    })
  }

  async run(msg: Message) {
    if (Object.keys(await APIUtil.findAll(msg.author)).length == 0)
      if (Object.keys(APIUtil.findAll(msg.author)).length == 0)
        return msg.reply("There's no stored data about you.")

    const { channel } = msg
    const perm1 =
      channel.type == 'DM' ||
      (channel.permissionsFor(client.user).has('ADD_REACTIONS') &&
        channel.permissionsFor(client.user).has('READ_MESSAGE_HISTORY'))
    const perm2 =
      channel.type == 'GUILD_TEXT' &&
      channel.permissionsFor(client.user).has('MANAGE_MESSAGES')

    const confirmMsg = await msg.reply(
      'Are you sure you want to delete all of your stored data? All of your account will be unlinked from this bot.\nReact to confirm (✅) or cancel (❌) the command.\nThis command will expire in 30 seconds.'
    )
    if (perm1) {
      await confirmMsg.react('✅')
      await confirmMsg.react('❌')
    }
    const filter = (reaction: MessageReaction, user: User) => {
      if (!['✅', '❌'].includes(reaction.emoji.name)) {
        if (perm2) reaction.users.remove(user)
        return false
      }
      return user.id == msg.author.id
    }
    const coll = await confirmMsg.awaitReactions({
      max: 1,
      time: 30000,
      filter
    })
    if (perm2) confirmMsg.reactions.removeAll()
    else
      confirmMsg.reactions.cache.forEach((r) => {
        if (r.me) r.users.remove()
      })
    if (coll.size == 0) return confirmMsg.edit('Command expired.')
    else {
      const reaction = coll.first().emoji.name
      if (reaction == '❌') return confirmMsg.edit('Command canceled.')
      else if (reaction == '✅') {
        await confirmMsg.edit('Command confirmed.')
        const res = await APIUtil.eraseAll(msg.author)
        if (res.length == 0) return msg.reply('There was no data about you.')
        const str = res.length > 1 ? ' has' : `s (${res.length}) have`
        return msg.reply(`Your account${str} been unlinked from this bot.`)
      }
    }
  }
}
