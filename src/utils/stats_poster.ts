import * as blapi from 'blapi'
import { client } from '../core/app'

const tokens = {}

Object.entries(require('../../listTokens.json')).forEach(([key, value]) => {
  if (!key.startsWith('_') && value) tokens[key] = value
})

export var available: boolean = Object.values(tokens).some((e) => !!e)

/**
 * Starts the auto-posting interval
 * @throws An error when when no service is available
 */
export async function start() {
  if (!available) throw new Error("Can't start poster without any API token!")

  return blapi.handle(client, tokens)
}

/**
 * Triggers a manual post
 * @throws An error when when no service is available
 */
export async function manualPost() {
  if (!available) throw new Error("Can't start poster without any API token!")

  return blapi.manualPost(client.guilds.cache.size, client.user.id, tokens)
}
