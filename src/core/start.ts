require('dotenv').config()

import * as fs from 'fs'
import nodemon from 'nodemon'

var child = nodemon('--watch src/utils/reloadme.json --exec "node -r ts-node/register --max-old-space-size=600" src/core/app.ts')

child.on('log', ({ colour }) => console.log(colour))
child.on('readable', function () { // the `readable` event indicates that data is ready to pick up
  this.stdout.pipe(fs.createWriteStream('output.txt'))
  this.stderr.pipe(fs.createWriteStream('err.txt'))
})

import { available, crash } from './backup'
child.on('crash', async (err) => {
  if (err) console.error(`Child process crashed with this error: ${err}`)
  if (available) {
    const backup = await crash().catch(console.error)
    if (backup instanceof Error) console.error('There has been an error: \n' + backup)
    else if (backup !== true) console.error('There has been an undefined error.')
  }
})
