import {
  PresenceStatusData,
  PresenceData,
  ActivitiesOptions,
  ActivityType
} from 'discord.js'
import { client, isDev } from '../core/app'

const interval = 12500

/** Class that makes it easier to add custom statuses (add them into the `status` array) */
class Presence {
  status: PresenceStatusData
  afk: boolean
  activity: ActivitiesOptions

  constructor(
    name: string,
    type?: ActivitiesOptions['type'],
    status?: PresenceStatusData,
    stream?: string
  ) {
    this.status = status || 'online'
    this.afk = false
    this.activity = {
      name,
      type: type || ActivityType.Playing,
      url: stream
    }
  }

  /** Replaces the dynamic variables inside the presence name */
  getName() {
    return this.activity.name
      .replace(
        new RegExp('/guildCount/', 'g'),
        client.guilds.cache.size.toString()
      )
      .replace(
        new RegExp('/userCount/', 'g'),
        client.users.cache.size.toString()
      )
  }

  get obj(): PresenceData {
    return {
      activities: [
        {
          ...this.activity,
          name: this.getName()
        }
      ],
      afk: this.afk,
      status: this.status
    }
  }
}

const status = isDev
  ? [new Presence('development', ActivityType.Watching, 'dnd')]
  : [
      new Presence('with the new slash commands!', ActivityType.Playing)
      // new Presence('for your requests!', 'WATCHING'),
      // new Presence('/guildCount/ servers.', 'WATCHING')
    ]

var index = 0

/** Reads a custom `Presence` instance and sets it to the client user
 */
function setPresence(indexOverride?: number) {
  const pres = status[indexOverride || index]
  index++
  index %= status.length
  client.user.setPresence(pres.obj)
}

if (status.length > 0) setPresence()
if (status.length > 1) setInterval(setPresence, interval)
