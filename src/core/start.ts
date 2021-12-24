require('dotenv').config()

import * as fs from 'fs'
import nodemon from 'nodemon'
import { uploadBackup } from './backup'

uploadBackup('Start')
nodemon(
  '--watch src/utils/reloadme.json --exec "node -r ts-node/register --max-old-space-size=600" src/core/app.ts'
)

nodemon.on('log', ({ colour }) => console.log(colour))
nodemon.on('readable', function () {
  // the `readable` event indicates that data is ready to pick up
  this.stdout.pipe(fs.createWriteStream('output.txt'))
  this.stderr.pipe(fs.createWriteStream('err.txt'))
})

nodemon.on('restart', () => uploadBackup('Restart'))

nodemon.on('exit', () => uploadBackup('Shutdown'))

nodemon.on('crash', async (err) => {
  if (err) console.error(`Child process crashed with this error: ${err}`)
  await uploadBackup('**CRASH**')
})
