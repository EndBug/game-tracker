require('dotenv').config()
var nodemon = require('nodemon')('--watch src/utils/reloadme.json --exec ts-node src/core/app.ts')

import * as fs from 'fs'

nodemon.on('log', ({ colour }) => console.log(colour))
nodemon.on('readable', function () { // the `readable` event indicates that data is ready to pick up
  this.stdout.pipe(fs.createWriteStream('output.txt'))
  this.stderr.pipe(fs.createWriteStream('err.txt'))
})

import { available, crash } from './backup'
if (available) nodemon.on('crash', async () => {
  const backup = await crash().catch(console.error)
  if (backup instanceof Error) console.error('There has been an error: \n' + backup)
  else if (backup !== true) console.error('There has been an undefined error.')
})
