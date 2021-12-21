import { APITable, Database, provider } from './provider'
import { readdirSync } from 'fs'
import { join as path } from 'path'
import { GuildMember, User, Snowflake } from 'discord.js-light'
import { client } from '../core/app'

export class API<T extends APITable> {
  apiKey: T
  gameName: string

  constructor(key: T, game: string) {
    this.apiKey = key
    this.gameName = game
  }

  get(key: Snowflake) {
    return provider.get(this.apiKey, key)
  }

  delete(key: Snowflake) {
    return provider.delete(this.apiKey, key)
  }

  set(value: Database[T][number]) {
    return provider.set(this.apiKey, value)
  }
}

type Class = { new (...args: any[]): any }

export class APIUtil {
  /** Where all APIs are stored */
  static APIs: { [T in APITable]: API<T> } = {
    ow: undefined,
    r6: undefined
  }

  static getAPIName(key: APITable) {
    return this.APIs[key].gameName
  }

  /** Loads every API into the `APIUtil.APIs` object */
  static loadAPIs() {
    const dir = path(__dirname, '../apis')
    const files = readdirSync(dir)
    for (const file of files) {
      const ClassFromModule: Class = require(path(
        __dirname,
        '../apis',
        file
      )).ApiLoader
      const api: API<any> = new ClassFromModule()
      this.APIs[api.apiKey] = api

      client.emit('debug', `[API] Loaded ${this.getAPIName(api.apiKey)} API`)
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

    const result: Partial<Record<APITable, any>> = {}
    for (const key in this.APIs) {
      const searchResult = this.APIs[key as APITable].get(target)
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

    const res: APITable[] = []
    for (const key in this.findAll(target)) {
      res.push(key as APITable)
      this.APIs[key as APITable].delete(target)
    }
    return res
  }
}
