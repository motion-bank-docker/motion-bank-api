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
    const request = {
      params: {
        id: req.body.uuid
      }
    }
    await mapService.getHandler(request, async result => {
      if (result.error) return send(res, result.code)
      data.map = result.data
      await annotationService.find({ 'target.id': data.map.uuid }, async result => {
        if (result.error) return send(res, result.code)
        data.annotations = result.annotations
        const filePath = await exports.createArchive(data)
        res.setHeader('Content-Type', 'application/zip')
        const file = fs.createReadStream(filePath)
        file.pipe(res)
      })
    })
  })
}

module.exports.createArchive = async (data) => {
  Assert.isType(data.map, 'object', 'data.map must be object')
  Assert.ok(Array.isArray(data.annotations), 'data.annotations must be array')

  const
    dir = path.join(os.tmpdir(), `map_archive_${data.map.uuid}`),
    archive = new yazl.ZipFile()

  try {
    await rimraf(dir)
  }
  catch (e) { /* ignored */ }

  await fs.mkdir(dir)
  await fs.mkdir(path.join(dir, 'map'))
  await fs.mkdir(path.join(dir, 'annotations'))

  const mapfile = path.join('map', `${data.map.uuid}.json`)
  await fs.writeFile(mapfile, JSON.stringify(data.map))
  archive.addFile(path.join(dir, mapfile), mapfile)

  for (let a of data.annotations) {
    const annofile = path.join('annotations', `${a.uuid}.json`)
    await fs.writeFile(path.join(dir, annofile), JSON.stringify(a))
    archive.addFile(path.join(dir, annofile), annofile)
  }

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

  return archivePath
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
