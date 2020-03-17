import util from 'util'
import { Util, Message } from 'discord.js'
const { splitMessage } = Util
import { stripIndents } from 'common-tags'
import { Command } from '../../utils/command'

const nl = '!!NL!!'
const nlPattern = new RegExp(nl, 'g')

function escapeRegex(str: string) {
  return str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
}

export default class EvalCommand extends Command {
  hrStart: [number, number]
  lastResult
  _sensitivePattern

  constructor() {
    super({
      name: 'eval',
      description: 'Executes JavaScript code.',
      details: 'Only the bot owner(s) may use this command.',
      ownerOnly: true,

      args: [
        {
          key: 'script',
          prompt: 'What code would you like to evaluate?'
        }
      ]
    })

    this.lastResult = null
    Object.defineProperty(this, '_sensitivePattern', { value: null, configurable: true })
  }

  run(msg: Message, [script]: string[]) {
    // Make a bunch of helpers
    /* eslint-disable @typescript-eslint/no-unused-vars-experimental */
    const message = msg
    const client = msg.client
    const lastResult = this.lastResult
    const doReply = val => {
      if (val instanceof Error) {
        msg.reply(`Callback error: \`${val}\``)
      } else {
        const result = this.makeResultMessages(val, process.hrtime(this.hrStart))
        if (Array.isArray(result)) {
          for (const item of result) msg.reply(item)
        } else {
          msg.reply(result)
        }
      }
    }
    /* eslint-enable @typescript-eslint/no-unused-vars-experimental */

    // Run the code and measure its execution time
    let hrDiff
    try {
      const hrStart = process.hrtime()
      this.lastResult = eval(script)
      hrDiff = process.hrtime(hrStart)
    } catch (err) {
      return msg.reply(`Error while evaluating: \`${err}\``)
    }

    // Prepare for callback time and respond
    this.hrStart = process.hrtime()
    const result = this.makeResultMessages(this.lastResult, hrDiff, script)
    if (Array.isArray(result)) {
      return Promise.all(result.map(item => msg.reply(item)))
    } else {
      return msg.reply(result)
    }
  }

  makeResultMessages(result, hrDiff, input = null) {
    const inspected = util.inspect(result, { depth: 0 })
      .replace(nlPattern, '\n')
      .replace(this.sensitivePattern, '--snip--')
    const split = inspected.split('\n')
    const last = inspected.length - 1
    const prependPart = inspected[0] !== '{' && inspected[0] !== '[' && inspected[0] !== '\'' ? split[0] : inspected[0]
    const appendPart = inspected[last] !== '}' && inspected[last] !== ']' && inspected[last] !== '\'' ?
      split[split.length - 1] :
      inspected[last]
    const prepend = `\`\`\`javascript\n${prependPart}\n`
    const append = `\n${appendPart}\n\`\`\``
    if (input) {
      return splitMessage(stripIndents`
				*Executed in ${hrDiff[0] > 0 ? `${hrDiff[0]}s ` : ''}${hrDiff[1] / 1000000}ms.*
				\`\`\`javascript
				${inspected}
				\`\`\`
			`, { maxLength: 1900, prepend, append })
    } else {
      return splitMessage(stripIndents`
				*Callback executed after ${hrDiff[0] > 0 ? `${hrDiff[0]}s ` : ''}${hrDiff[1] / 1000000}ms.*
				\`\`\`javascript
				${inspected}
				\`\`\`
			`, { maxLength: 1900, prepend, append })
    }
  }

  get sensitivePattern() {
    if (!this._sensitivePattern) {
      const client = this.client
      let pattern = ''
      if (client.token) pattern += escapeRegex(client.token)
      Object.defineProperty(this, '_sensitivePattern', { value: new RegExp(pattern, 'gi'), configurable: false })
    }
    return this._sensitivePattern
  }
}
