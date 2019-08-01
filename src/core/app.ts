require('dotenv').load();

type Class = { new(...args: any[]): any; };

import * as Discord from 'discord.js';
import * as Commando from 'discord.js-commando';
import * as sqlite from 'sqlite';
import * as path from 'path';
import * as fs from 'fs';

import { API } from '../utils/utils'; // eslint-disable-line no-unused-vars
import * as stats_poster from '../utils/stats_poster';

const { TOKEN } = process.env;

export let client: Commando.CommandoClient;
export let homeguild: Discord.Guild;
export let owner: Discord.User;
export let roles: Record<string, Discord.Role> = {};
export let links: Record<string, string> = {};
export const APIS: Record<string, API> = {};
export let APIUtil: {
  find(target: string | Discord.GuildMember | Discord.User, realName?: boolean): { [api: string]: any }
  erase(target: string | Discord.GuildMember | Discord.User): string[]
};

import * as backup from './backup';

/**
 * Creates the client, sets event handlers, registers groups and commands, sets the provider, loads APIs 
 */
async function initClient() {
  client = new Commando.CommandoClient({
    commandPrefix: '-',
    owner: '218308478580555777',
    //@ts-ignore
    unknownCommandResponse: false
  });

  client.on('error', console.error);
  client.on('warn', console.warn);
  client.on('debug', console.log);

  client.on('ready', () => {
    homeguild = client.guilds.get('475792603867119626');
    owner = homeguild.members.get('218308478580555777').user;
    roles = {
      dev: homeguild.roles.get('498225931299848193')
    };
    links = {
      invite: `<https://discordapp.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=93248>`,
      support: 'https://discord.gg/ZhnWkqc'
    };
  });

  client.registry.registerGroups([
    ['bot', 'Bot'],
    ['data', 'Data management'],
    ['dbl', 'Discord Bots List'],
    ['dev', 'Developers'],
    ['ow', 'Overwatch']
  ]).registerDefaultGroups()
    .registerDefaultTypes()
    .registerDefaultCommands({
      ping: false,
      unknownCommand: false
    });

  client.login(TOKEN);

  await client.setProvider(
    // @ts-ignore
    sqlite.open(path.join(__dirname, '../../data/settings.sqlite3')).then(db => new Commando.SQLiteProvider(db)) //tslint-disable-line
  ).catch(console.error);

  // Starts the stat poster interval
  if (stats_poster.available) try {
    await stats_poster.start();
  } catch (e) { console.error(e); }
  else console.log('No optional DBL token found.');

  loadAPIs();

  // #region "Manual" command loading
  /*const commandDirs = path.join(__dirname, '../commands');
  const dirs = fs.readdirSync(commandDirs);
  for (const groupDir of dirs) {
    if (groupDir != 'samples') {
      const files = fs.readdirSync(path.join(commandDirs, groupDir));
      for (const file of files) {
        const c = require(path.join(commandDirs, groupDir, file)).default;
        client.registry.registerCommand(c);
      }
    }
  }*/
  // #endregion

  client.registry.registerCommandsIn({
    dirname: path.join(__dirname, '../commands'),
    filter: /(.+)\.ts$/,
    excludeDirs: /^\.(git|svn)|samples$/,
    recursive: true
  });

  return client;
}

/**
 * Logs a load statement
 * @param name 
 */
export function loader(name: string) {
  console.log(`[LOADER] Loaded '${name}'`);
}

/**
 * Loads every api in ../apis into APIS, builds APIUtil
 */
function loadAPIs() {
  const dir = path.join(__dirname, '../apis');
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const ClassFromModule: Class = require(path.join(__dirname, '../apis', file)).ApiLoader;
    const api: API = new ClassFromModule();
    APIS[api.name] = api;
    loader(`apis/${file}`);
  }

  /**
   * Finds entries for the target in every API.
   * @param target The GuildMember, User or user ID of the target
   * @param realName Whether to use the real or key name for APIs
   */
  const find = (target: string | Discord.GuildMember | Discord.User, realName = false) => { //find data in every API
    if (target instanceof Discord.GuildMember || target instanceof Discord.User) target = target.id;
    const res: { [api: string]: any } = {};
    for (const key in APIS) {
      const req = APIS[key].store.get(target);
      if (req) res[realName ? APIS[key].game : key] = req;
    }
    return res;
  };

  /**
   * Deletes every entry with the target from every API.
   * @param target The GuildMember, User or user ID of the target
   */
  const erase = (target: string | Discord.GuildMember | Discord.User) => { // erase data from every API
    if (target instanceof Discord.GuildMember || target instanceof Discord.User) target = target.id;
    const res: string[] = [];
    for (const key in find(target)) {
      res.push(key);
      APIS[key].store.delete(target);
    }
    return res; // the APIS from which the user has been erased
  };

  APIUtil = { find, erase };
}

const custom_modules = ['automation'];
/**
 * Loads every module group from the `custom_modules` array 
 */
function loadModules() {
  for (const groupName of custom_modules) {
    const groupDirectory = path.join(__dirname, '..', groupName);
    const files = fs.readdirSync(groupDirectory);
    for (const file of files) {
      require(path.join(groupDirectory, file));
      loader(`${groupName}/${file}`);
    }
  }
}

(async () => {
  if (backup.available) await backup.init().catch(console.error);
  else console.log('No backup token found.');
  await initClient();
  loadModules();
})().catch(console.error);
