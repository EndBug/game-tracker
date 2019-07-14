import { ActivityType, PresenceStatus } from 'discord.js'; //eslint-disable-line no-unused-vars
import { client } from '../core/app';

const interval = 12500;

/**
 * Class that makes it easier to add custom statuses (add them into the `status` array)
 */
class Presence {
  status: PresenceStatus
  afk: boolean
  game: {
    name: string
    type: ActivityType
    url?: string
  }

  constructor(name: string, type?: ActivityType, status?: PresenceStatus, stream?: string) {
    this.status = status || 'online';
    this.afk = false;
    this.game = {
      name: name.replace(new RegExp('/guildCount/', 'g'), client.guilds.size.toString()),
      type: type || 'PLAYING',
      url: stream
    };
  }
}

const status = [
  new Presence('for your requests!', 'WATCHING'),
  new Presence('/guildCount/ servers.', 'WATCHING')
];

var index = 0;

/**
 * Reads a custom `Presence` instance and sets it to the client user
 * @param obj The `Presence` to read
 */
function setPresence(obj: Presence) {
  index++;
  index %= status.length;

  client.user.setStatus(obj.status);
  client.user.setActivity(obj.game.name, {
    type: obj.game.type
  });
}


if (status.length > 0) setPresence(status[0]);
if (status.length > 1) setInterval(setPresence, interval, status[index]);