import { Client as StatClient } from 'statcord.js'
import { Client as DiscordClient } from 'discord.js'

export let statcord: StatClient

export const init = (client: DiscordClient) => {
  statcord = new StatClient({
    client,
    key: process.env.STATCORD_TOKEN
  })
}

interface postOptions {
  errorHandling?: 'throw' | 'log' | 'ignore'
  ignoreUndefined?: boolean
}
export function postCommand(
  command_name: string,
  user_id: string,
  options: postOptions = {}
) {
  try {
    if (statcord) statcord.postCommand(command_name, user_id)
    else if (options.ignoreUndefined === false)
      throw new Error('Statcord client is undefined')
  } catch (e) {
    if (!options.errorHandling || options.errorHandling == 'throw') throw e
    if (options.errorHandling == 'log') console.error(e)
  }
}
