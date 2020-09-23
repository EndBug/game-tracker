import { Client as StatClient } from 'statcord.js'
import { client } from '../core/app'

export let statcord: StatClient

export const init = () => {
  statcord = new StatClient({
    client,
    key: process.env.STATCORD_TOKEN
  })
}
