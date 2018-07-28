const
  yazl = require('yazl'),
  yauzl = require('yauzl'),
  path = require('path'),
  fs = require('mz/fs'),
  rimraf = require('rimraf'),
  os = require('os'),
  multer = require('multer'),
  send = require('@polka/send-type'),
  { Assert } = require('mbjs-utils')

module.exports.setupArchives = (app, mapService, annotationService) => {
  const upload = multer({ dest: os.tmpdir() })
  app.post('/archives/maps', async (req, res) => {
    let data = {}
    let request = {
      params: {
        id: req.body.id
      },
      user: req.user
    }
    await mapService.getHandler(request, async result => {
      if (result.error) return send(res, result.code)
      data.map = result.data
      request = {
        query: {
          query: JSON.stringify({'target.id': data.map.uuid})
        },
        user: req.user
      }
      await annotationService.findHandler(request, async result => {
        if (result.error) return send(res, result.code)
        data.annotations = result.data.items
        const fileId = await exports.createArchive(data)
        send(res, 200, fileId)
      })
    })
  })
  app.get('/archives/maps/:id', async (req, res) => {
    const filename = `map_archive_${req.params.id}.zip`
    const filePath = path.join(os.tmpdir(), filename)
    const file = fs.createReadStream(filePath)
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    file.pipe(res)
  })
  app.post('/archives/maps/upload', async function (req, res) {
    upload.single('file')(req, res, async () => {
      const results = await exports.readArchive(req.file.path)
      const copy = req.body.title || false
      let hasDuplicates = false
      if (results.maps && !copy) {
        for (let map of results.maps) {
          const getRequest = {
            params: { id: map.uuid },
            user: req.user
          }
          const item = await mapService.getHandler(getRequest)
          if (!item.error) hasDuplicates = true
        }
      }
      if (results.annotations && !copy) {
        for (let annotation of results.annotations) {
          const getRequest = {
            params: { id: annotation.uuid },
            user: req.user
          }
          const item = await annotationService.getHandler(getRequest)
          if (!item.error) hasDuplicates = true
        }
      }
      if (hasDuplicates) send(res, 400, { message: 'errors.has_duplicates' })
      else {
        const mappings = {}
        if (results.maps) {
          for (let map of results.maps) {
            let oldId = map.uuid
            for (let k of Object.keys(map)) {
              if (k[0] === '_') map[k] = undefined
            }
            if (copy) {
              map.title = req.body.title
              map.uuid = undefined
            }
            const postRequest = {
              body: map,
              user: req.user
            }
            const result = await mapService.postHandler(postRequest)
            if (copy) mappings[oldId] = result.data.uuid
          }
        }
        if (results.annotations) {
          for (let annotation of results.annotations) {
            for (let k of Object.keys(annotation)) {
              if (k[0] === '_') annotation[k] = undefined
            }
            if (copy) {
              annotation.target.id = mappings[annotation.target.id]
              annotation.uuid = undefined
            }
            const postRequest = {
              body: annotation,
              user: req.user
            }
            await annotationService.postHandler(postRequest)
          }
        }
        send(res, 200)
      }
    })
  })
}

module.exports.createArchive = async (data) => {
  Assert.isType(data.map, 'object', 'data.map must be object')
  Assert.ok(Array.isArray(data.annotations), 'data.annotations must be array')

  const
    dir = path.join(os.tmpdir(), `map_archive_${data.map.uuid}`),
    archive = new yazl.ZipFile()

  await new Promise((resolve, reject) => {
    rimraf(dir, err => {
      if (err) return reject(err)
      resolve()
    })
  })

  await fs.mkdir(dir)
  await fs.mkdir(path.join(dir, 'maps'))
  await fs.mkdir(path.join(dir, 'annotations'))

  const mapfile = path.join('maps', `${data.map.uuid}.json`)
  await fs.writeFile(path.join(dir, mapfile), JSON.stringify(data.map))
  archive.addFile(path.join(dir, mapfile), mapfile)

  for (let a of data.annotations) {
    const annofile = path.join('annotations', `${a.uuid}.json`)
    await fs.writeFile(path.join(dir, annofile), JSON.stringify(a))
    archive.addFile(path.join(dir, annofile), annofile)
  }

  archive.end()

  const archivePath = `${dir}.zip`
  await new Promise((resolve, reject) => {
    archive.outputStream.pipe(fs.createWriteStream(archivePath))
      .on('error', err => {
        reject(err)
      })
      .on('close', () => {
        resolve()
      })
  })

  return path.basename(data.map.uuid)
}

module.exports.readArchive = archivePath => {
  const results = {}
  const getFile = (entry, zipfile) => {
    return new Promise((rs, rj) => {
      let data = ''
      zipfile.openReadStream(entry, function (err, readStream) {
        if (err) return rj(err)
        readStream.on('data', chunk => {
          data += chunk.toString()
        })
        readStream.on('end', () => rs(data))
        readStream.on('error', err => rj(err))
      })
    })
  }
  return new Promise((resolve, reject) => {
    yauzl.open(archivePath, {lazyEntries: true}, async (err, zipfile) => {
      if (err) return reject(err)
      zipfile.readEntry()
      zipfile.on('end', () => resolve(results))
      zipfile.on('error', err => reject(err))
      zipfile.on('entry', async entry => {
        if (/\/$/.test(entry.fileName)) zipfile.readEntry()
        else {
          const type = path.dirname(entry.fileName)
          const data = await getFile(entry, zipfile)
          const obj = JSON.parse(data)
          if (!results[type]) results[type] = []
          results[type].push(obj)
          zipfile.readEntry()
        }
      })
    })
  })
}
