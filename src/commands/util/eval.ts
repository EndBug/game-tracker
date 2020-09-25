import { Command } from '../../utils/command'
import { Message } from 'discord.js'
import { inspect } from 'util'

// eslint-disable-next-line @typescript-eslint/no-unused-vars-experimental
import * as utils from '../../utils/utils' // lgtm [js/unused-local-variable]

function clean(text: string) {
  if (typeof (text) === 'string')
    return text.replace(/`/g, '`' + String.fromCharCode(8203)).replace(/@/g, '@' + String.fromCharCode(8203))
  else
    return text
}

export default class EvalCommand extends Command {
  constructor() {
    super({
      name: 'eval',
      description: 'Runs a script from the message.',
      ownerOnly: true,
      format: 'eval <script>',
      args: [
        {
          key: 'script',
          prompt: 'The code you want to run'
        }
      ]
    })
  }

  async run(msg: Message, _args: any[], rawArgs: string[]) {
    const { client, channel } = msg // eslint-disable-line @typescript-eslint/no-unused-vars-experimental

    try {
      const code = rawArgs.join(' ')
      let evaled = eval(code)

      if (typeof evaled !== 'string')
        evaled = inspect(evaled)

      return msg.channel.send(clean(evaled), { code: 'xl' })
    } catch (err) {
      return msg.channel.send(`\`ERROR\` \`\`\`xl\n${clean(err)}\n\`\`\``)
    }
  }
}
