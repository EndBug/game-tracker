import { Client as StatClient } from 'statcord.js'
import { client } from '../core/app'

export const statcord = new StatClient({
  client,
  key: process.env.STATCORD_TOKEN
})
