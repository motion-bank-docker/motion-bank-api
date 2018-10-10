const
  Acl = require('acl'),
  Backend = Acl.mongodbBackend,
  MongoClient = require('mongodb').MongoClient,
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
    if (m[0] === '.') continue
    const file = await fs.readFile(path.join(folder, 'maps', m))
    const entry = JSON.parse(file)
    const existing = await mapsClient.get(entry.uuid)
    if (existing) await mapsClient.update(entry.uuid, updateAuthor(entry))
    else await mapsClient.create(updateAuthor(entry))
  }

  const annoClient = new MongoDB(
    ObjectUtil.merge({ name: 'annotations', logger: console },
      config.get('resources.mongodb')),
    'uuid'
  )
  await annoClient.connect()
  const annos = await fs.readdir(path.join(folder, 'annotations'))
  for (let a of annos) {
    if (a[0] === '.') continue
    const file = await fs.readFile(path.join(folder, 'annotations', a))
    const entry = JSON.parse(file)
    const existing = await annoClient.get(entry.uuid)
    if (existing) await annoClient.update(entry.uuid, updateAuthor(entry))
    else await annoClient.create(updateAuthor(entry))
  }

  const cfg = config.get('acl.mongodb')
  cfg.logger = console

  const db = await new Promise((resolve, reject) => {
    MongoClient.connect(cfg.url, function (err, client) {
      if (err) return reject(err)
      cfg.logger.info(`ACL connected at ${cfg.url}/${cfg.dbName}`)
      const db = client.db(cfg.dbName)
      resolve(db)
    })
  })

  const acl = new Acl(new Backend(db))
  const acls = await fs.readdir(path.join(folder, 'acl'))
  for (let a of acls) {
    if (a[0] === '.') continue
    const file = await fs.readFile(path.join(folder, 'acl', a))
    const entry = JSON.parse(file)
    await new Promise((resolve, reject) => {
      const resource = a.replace('.json', '')
      acl.allow(entry.role, resource, entry.permissions, err => {
        if (err) reject(err)
        else resolve()
      })
    })
  }
}

proc(folder).then(() => process.exit(0))
