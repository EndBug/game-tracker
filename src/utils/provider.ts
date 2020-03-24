/* eslint-disable no-dupe-class-members */
import { readFileSync, writeFileSync } from 'fs'
import { join as path } from 'path'
import { Snowflake } from 'discord.js'
import { APIKey, APIUtil } from './api'
import { PartialRecord, enforceType } from './utils'

const filePath = '../../data/settings.json'

export interface Settings
  extends Record<SettingsKey, Record<Snowflake, string>>,
  Record<APIKey, Record<Snowflake, string[]>> { }

export type ProviderKey = keyof Settings
export type SettingsKey = 'p'

class Provider {
  path: string
  settings: Settings

  constructor() {
    this.path = path(__dirname, filePath)
    this.settings = this.readData()
  }

  delete<T extends ProviderKey>(settingsKey: T, recordKey: keyof Settings[T]) {
    delete this.settings[settingsKey][recordKey]
    this.save()
  }

  get<T extends ProviderKey>(settingsKey: T, recordKey: keyof Settings[T]) {
    return this.settings[settingsKey][recordKey]
  }

  getKey<T extends ProviderKey>(settingsKey: T, value) {
    for (const recordKey in this.settings[settingsKey]) {
      if (this.settings[settingsKey][recordKey] == value) return recordKey
    }
  }

  set<T extends ProviderKey>(settingsKey: T, recordKey: keyof Settings[T], value: Settings[T][keyof Settings[T]]) {
    this.settings[settingsKey][recordKey] = value
    this.save()
  }

  stats(): Record<APIKey, number> {
    const res: PartialRecord<APIKey, number> = {}
    for (const key in APIUtil.APIs) {
      res[key] = Object.keys(this.settings[key]).length
    }
    if (enforceType<Record<APIKey, number>>(res))
      return res
  }

  private readData(): Settings {
    const str = readFileSync(this.path, { encoding: 'utf8' })
    return JSON.parse(str)
  }

  save() {
    const str = JSON.stringify(this.settings)
    writeFileSync(this.path, str)
  }
}

export const provider = new Provider()
