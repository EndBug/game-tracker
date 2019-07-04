import { Poster } from 'dbots';
import { client } from '../core/app';

const { discordbotsorg, botsondiscord, botsfordiscord, discordbotsgg } = process.env;
const tokens = { discordbotsorg, botsondiscord, botsfordiscord, discordbotsgg };

export var available: boolean = !!Object.values(tokens).find(e => !!e);
export var interval: number = 1800000; //ms

export var poster: Poster;

/**
 * Starts the interval for the poster
 * @throws An error when when no service is available
 */
export function start() {
  if (!available) throw new Error('Can\'t start poster without any API token!');

  poster = new Poster({
    client: client,
    clientLibrary: 'discord.js',
    apiKeys: tokens
  });

  poster.startInterval(interval);
  return poster.post();
}

/**
 * Changes the number of ms that pass between one post and the following
 * @param newInterval The new number of ms
 * @returns Whether the change was successfully completed
 */
export function changeInterval(newInterval: number) {
  if (!available) return false;

  interval = newInterval;
  poster.stopInterval();
  poster.startInterval();
  return true;
}