import { provider } from './provider'
import { readdirSync } from 'fs'
import { join as path } from 'path'
import { GuildMember, User, Snowflake } from 'discord.js'
import { enforceType, PartialRecord } from './utils'

export type APIKey = 'ow' | 'r6'

export class API {
  apiKey: APIKey;
  gameName: string;

  constructor(key: APIKey, game: string) {
    this.apiKey = key
    this.gameName = game
  }

  get(key: Snowflake) {
    return provider.get(this.apiKey, key)
  }

  getKey(value) {
    return provider.getKey(this.apiKey, value)
  }

  delete(key: Snowflake) {
    return provider.delete(this.apiKey, key)
  }

  set(key: Snowflake, value: string[]) {
    return provider.set(this.apiKey, key, value)
  }
}

type Class = { new(...args: any[]): any; };

export class APIUtil {
  /** Where all APIs are stored */
  static APIs: Record<APIKey, API> = {
    ow: undefined,
    r6: undefined
  }

  static getAPIName(key: APIKey) {
    return this.APIs[key].gameName
  }

  /** Loads every API into the `APIUtil.APIs` object */
  static loadAPIs() {
    const dir = path(__dirname, '../apis')
    const files = readdirSync(dir)
    for (const file of files) {
      const ClassFromModule: Class = require(path(__dirname, '../apis', file)).ApiLoader
      const api: API = new ClassFromModule()
      this.APIs[api.apiKey] = api
    }
  }

  /**
   * Finds user entries in every game's database
   * @param target The user to search
   * @param [realName] Whether to map 
   * @returns An object with every result mapped by APIKey
   */
  static findAll(target: string | GuildMember | User) {
    if (typeof target != 'string') target = target.id

    const result: PartialRecord<APIKey, any> = {}
    for (const key in this.APIs) {
      if (!enforceType<APIKey>(key)) return

      const searchResult = this.APIs[key].get(target)
      if (searchResult) result[key] = searchResult
    }
    return result
  }

  /**
   * Erases a user from every game's database
   * @param target The user to erase
   * @returns The APIs from which the user has been erased
   */
  static eraseAll(target: string | GuildMember | User) {
    if (typeof target != 'string') target = target.id

    const res: APIKey[] = []
    for (const key in this.findAll(target)) {
      if (!enforceType<APIKey>(key)) return

      res.push(key)
      this.APIs[key].delete(target)
    }
    return res
  }
}
