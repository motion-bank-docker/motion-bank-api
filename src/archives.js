const
  yazl = require('yazl'),
  yauzl = require('yauzl'),
  path = require('path'),
  fs = require('mz/fs'),
  rimraf = require('rimraf'),
  os = require('os'),
  send = require('@polka/send-type'),
  { Assert } = require('mbjs-utils')

module.exports.setupArchives = (app, mapService, annotationService) => {
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
  yauzl.open(archivePath, {lazyEntries: true}, function (err, zipfile) {
    if (err) throw err
    zipfile.readEntry()
    zipfile.on('entry', function (entry) {
      if (/\/$/.test(entry.fileName)) {
        // Directory file names end with '/'.
        // Note that entires for directories themselves are optional.
        // An entry's fileName implicitly requires its parent directories to exist.
        zipfile.readEntry()
      }
      else {
        // file entry
        zipfile.openReadStream(entry, function (err, readStream) {
          if (err) throw err
          readStream.on('end', function () {
            zipfile.readEntry()
          })
        })
      }
    })
  })
}
