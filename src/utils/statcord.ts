import { Client as StatClient } from 'statcord.js'
import { Client as DiscordClient } from 'discord.js-light'

export let statcord: StatClient

export const init = (client: DiscordClient) => {
  statcord = new StatClient({
    client,
    key: process.env.STATCORD_TOKEN
  })
}
