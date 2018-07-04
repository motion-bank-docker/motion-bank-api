const
  path = require('path'),
  fs = require('mz/fs'),
  { MongoDB } = require('mbjs-persistence'),
  { ObjectUtil } = require('mbjs-utils'),
  config = require('config')

const folder = process.env.FOLDER

if (!folder) throw new Error('no input folder specified')

const proc = async function (folder) {
  const mapsClient = new MongoDB(
    ObjectUtil.merge({ name: 'maps', logger: console },
      config.get('resources.mongodb')),
    'uuid'
  )
  await mapsClient.connect()
  const maps = await fs.readdir(path.join(folder, 'maps'))
  for (let m of maps) {
    const file = await fs.readFile(path.join(folder, 'maps', m))
    const entry = JSON.parse(file)
    await mapsClient.create(entry)
  }

  const annoClient = new MongoDB(
    ObjectUtil.merge({ name: 'annotations', logger: console },
      config.get('resources.mongodb')),
    'uuid'
  )
  await annoClient.connect()
  const annos = await fs.readdir(path.join(folder, 'annotations'))
  for (let a of annos) {
    const file = await fs.readFile(path.join(folder, 'annotations', a))
    const entry = JSON.parse(file)
    await annoClient.create(entry)
  }
}

proc(folder)
  .then(() => process.exit(0))
