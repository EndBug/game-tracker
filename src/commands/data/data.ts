import { Command } from '../../utils/command'
import { APIUtil } from '../../utils/api'
import { Message } from 'discord.js-light'

export default class DataCMD extends Command {
  constructor() {
    super({
      name: 'data',
      aliases: ['data-managment', 'data-info'],
      description: 'Shows you all the data the the bot stored about you.',
      details:
        "It does not include temporary caching; that data is automatically deleted anyways and doesn't get stored in the database.",
      args: [
        {
          key: 'hide',
          prompt:
            'Whether you want to hide your accounts in the message this command shows.',
          parse: (str) => {
            return !['0', 'false', 'no'].includes(str)
          },
          default: false
        }
      ]
    })
  }

  run(msg: Message, [hide]: [boolean]) {
    const res = APIUtil.findAll(msg.author)
    let text: string
    if (Object.keys(res).length > 0) {
      text = 'This is your data:\n```'
      for (const key in res) {
        const str = hide ? '***' : JSON.stringify(res[key])
        text += `\n${key}: ${str}`
      }
      text +=
        "\n```If you want to unlink one of these accounts search for the 'unlink' command for that game (you can use `help` to find it).\nTo delete all of your data, run `erase-data`"
    } else text = "There's no data about you in the database."
    return msg.reply(text)
  }
}
