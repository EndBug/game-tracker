import { Poster } from 'dbots'
import { PosterOptions } from 'dbots/lib/Utils/Constants'
import { client } from '../core/app'

const tokens: PosterOptions['apiKeys'] = {}

for (const key in process.env) {
  if (key.startsWith('BOTLIST_')) tokens[key.replace('BOTLIST_', '')] = process.env[key]
}

export var available: boolean = !!Object.values(tokens).find(e => !!e)
export var interval: number = 1800000 // ms

export var poster: Poster

/**
 * Starts the interval for the poster
 * @throws An error when when no service is available
 */
export async function start() {
  if (!available) throw new Error('Can\'t start poster without any API token!')

  poster = new Poster({
    client: client,
    clientLibrary: 'discord.js',
    apiKeys: tokens
  })

  poster.addHandler('autopostSuccess', result => {
    const n = result instanceof Array ? result.length : 1
    console.log(`[DBOTS] Posted stats to ${n} services`)
  })

  poster.startInterval(interval)
  const result = await poster.post()
  poster.runHandlers('autopostSuccess', result)
  return result
}

/**
 * Changes the number of ms that pass between one post and the following
 * @param newInterval The new number of ms
 * @returns Whether the change was successfully completed
 */
export function changeInterval(newInterval: number) {
  if (!available) return false

  interval = newInterval
  poster.stopInterval()
  poster.startInterval()
  return true
}
