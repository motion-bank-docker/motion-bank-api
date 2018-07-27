const
  path = require('path'),
  fs = require('mz/fs'),
  { MongoDB } = require('mbjs-persistence'),
  { ObjectUtil } = require('mbjs-utils'),
  config = require('config')

const
  folder = process.env.FOLDER,
  authorUUID = process.env.AUTHOR_UUID,
  authorName = process.env.AUTHOR_NAME

if (!folder) throw new Error('no input folder specified')

const updateAuthor = entry => {
  if (!entry.author) entry.author = {}
  if (typeof entry.author === 'string') entry.author = { id: entry.author }
  if (authorName) entry.author.name = authorName
  if (authorUUID) entry.author.id = authorUUID
  return entry
}

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
    await mapsClient.create(updateAuthor(entry))
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
    await annoClient.create(updateAuthor(entry))
  }
}

proc(folder)
  .then(() => process.exit(0))
