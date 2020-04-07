const
  path = require('path'),
  fs = require('mz/fs'),
  os = require('os'),
  multer = require('multer'),
  send = require('@polka/send-type'),
  config = require('config'),
  Minio = require('minio'),
  archive = require('mbjs-archive'),
  { ObjectUtil, uuid } = require('mbjs-utils'),
  parseURI = require('mbjs-data-models/src/lib/parse-uri'),
  constants = require('mbjs-data-models/src/constants'),
  { URL } = require('url')

module.exports.setupArchives = (api, mapService, annotationService, cellService) => {
  const upload = multer({ dest: os.tmpdir() })
  api.app.post('/archives/maps/:uuid', async (req, res) => {
    let result, data = {}

    const conf = {
      params: { uuid: req.params.uuid },
      headers: req.headers,
      user: req.user
    }
    result = await mapService.getHandler(conf)
    if (result.error) return send(res, result.error.code || 500)
    else data.maps = [result.data]

    result = await annotationService.findHandler({
      query: {
        query: JSON.stringify({'target.id': data.maps[0].id})
      },
      headers: req.headers,
      user: req.user
    })
    if (result.error) return send(res, result.error.code || 500)
    data.annotations = result.data.items

    for (let annotation of data.annotations) {
      if (annotation.body.type === `${constants.BASE_URI_NS}cell.jsonld`) continue

      result = await cellService.findHandler({
        query: {
          query: JSON.stringify({'target.id': annotation.id})
        },
        headers: req.headers,
        user: req.user
      })
      if (!result.error && Array.isArray(result.data)) data.annotations = data.annotations.concat(result.data)
      else if (result.error && result.error.code !== 404) return send(res, result.error.code || 500)
    }

    data.cells = []
    for (let annotation of data.annotations) {
      if (annotation.body.type !== `${constants.BASE_URI_NS}cell.jsonld`) continue

      result = await cellService.findHandler({
        query: {
          query: { uuid: parseURI(annotation.body.source.id).uuid }
        },
        headers: req.headers,
        user: req.user
      })
      if (!result.error) data.cells = data.cells.concat(result.data.items)
    }

    const dir = path.join(os.tmpdir(), `archive_${ObjectUtil.slug(data.maps[0].title)}_${data.maps[0]._uuid}`)
    const archivePath = `${dir}.zip`

    await archive.write(archivePath, data)

    const opts = Object.assign({}, config.assets.client)
    opts.useSSL = config.assets.client.useSSL && (config.assets.client.useSSL === true || config.assets.client.useSSL === 'true')
    opts.port = config.assets.client.port ? parseInt(config.assets.client.port) : undefined
    const minioClient = new Minio.Client(opts)
    await minioClient.fPutObject(config.assets.archivesBucket, path.basename(archivePath), archivePath, { 'Content-Type': 'application/zip' })
    await fs.unlink(archivePath)
    const url = await minioClient.presignedGetObject(config.assets.archivesBucket, path.basename(archivePath))

    send(res, 200, url)
  })
  api.app.post('/archives/maps', async function (req, res) {
    upload.single('file')(req, res, async () => {
      let idMappings
      const results = await archive.read(req.file.path)

      const createMappings = (items, idMappings = {}) => {
        if (Array.isArray(items)) {
          for (let item of items) {
            const parsed = new URL(item.id)
            let [type] = parsed.pathname.substr(1).split('/')
            idMappings[item.id] = `${parsed.protocol}//${parsed.host}/${type}/${uuid.v4()}`
          }
        }
        return idMappings
      }
      const applyMappings = (item, idMappings) => {
        let str = JSON.stringify(item)
        const ids = Object.keys(idMappings)
        for (let id of ids) {
          const escaped = id.replace(/\./g, '\\.').replace(/\//g, '\\/')
          str = str.replace(new RegExp(escaped, 'g'), idMappings[id])
        }
        return JSON.parse(str)
      }

      if (req.body.title) {
        for (let map of results.maps) {
          map.title = req.body.title
        }
        idMappings = createMappings(results.maps)
        idMappings = createMappings(results.annotations, idMappings)
        idMappings = createMappings(results.cells, idMappings)
      }

      const importItems = async function (items, service, idMappings = undefined) {
        for (let item of items) {
          if (idMappings) item = applyMappings(item, idMappings)
          if (req.body.overrideAuthor) item.creator = { id: req.user.id, name: req.user.profile.name }
          const getRequest = {
            params: { uuid: parseURI(item.id).uuid },
            headers: req.headers,
            user: req.user
          }
          const result = await service.getHandler(getRequest)
          const request = {
            params: { uuid: parseURI(item.id).uuid },
            headers: req.headers,
            body: item,
            user: req.user
          }
          if (result.error) {
            if (result.code === 404) {
              await service.postHandler(request)
            }
            else return send(res, result.code || 500)
          }
          else {
            await service.putHandler(request)
          }
        }
      }

      await importItems(results.maps, mapService, idMappings)
      await importItems(results.annotations, annotationService, idMappings)
      if (Array.isArray(results.cells)) await importItems(results.cells, cellService, idMappings)

      send(res, 200)
    })
  })
}
