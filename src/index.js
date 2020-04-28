const
  config = require('config'),
  GenericAPI = require('mbjs-generic-api'),
  { version } = require('../package.json'),
  { parseURI } = require('mbjs-data-models/src/lib')

const setup = async function () {
  const api = new GenericAPI()
  await api.setup(version)

  /**
   * Configure Profiles
   */
  const
    Profiles = require('./lib/profiles'),
    profiles = new Profiles(api)
  // profiles.on('message', message => api._logger.debug(message))

  const addCreator = require('mbjs-generic-api/src/middleware/creator')
  addCreator(api, config)

  /**
   * Configure resources
   */
  const
    models = require('mbjs-data-models'),
    Service = require('mbjs-generic-api/src/lib/service')

  const cells = new Service('cells', api, models.Cell)
  // cells.on('message', message => api._sockets.write(message))

  const annotations = new Service('annotations', api, models.Annotation, {
    async delete (req, res, payload) {
      if (!payload) return

      if (payload.body.type.indexOf('cell.jsonld') > -1) {
        try {
          await cells.deleteHandler({
            params: { uuid: parseURI(payload.body.source.id).uuid },
            headers: req.headers
          })
        }
        catch (err) {
          api.captureException(err)
        }
      }
      else {
        try {
          const results = await annotations.findHandler({
            query: { query: JSON.stringify({ 'target.id': payload.id }) },
            headers: req.headers
          })
          if (results.data && Array.isArray(results.data.items)) {
            for (const annotation of results.data.items) {
              await annotations.deleteHandler({
                params: { uuid: parseURI(annotation.id).uuid },
                headers: req.headers
              })
            }
          }
        }
        catch (err) {
          api.captureException(err)
        }
      }
    }
  })
  // annotations.on('message', message => api._sockets.write(message))

  const maps = new Service('maps', api, models.Map, {
    async delete (req, res, payload) {
      if (!payload) return

      const results = await annotations.findHandler({
        query: { query: JSON.stringify({ 'target.id': payload.id }) },
        headers: req.headers
      })
      if (results.data && Array.isArray(results.data.items)) {
        for (const annotation of results.data.items) {
          try {
            await annotations.deleteHandler({
              params: { uuid: parseURI(annotation.id).uuid },
              headers: req.headers
            })
          }
          catch (err) {
            api.captureException(err)
          }
        }
      }
    }
  })
  // maps.on('message', message => api._sockets.write(message))

  const documents = new Service('documents', api, models.Document)
  // documents.on('message', message => api._sockets.write(message))

  const components = new Service('components', api, models.Component)
  // components.on('message', message => api._sockets.write(message))

  const Manage = require('./lib/manage')
  const manage = new Manage(api)

  /**
   * Configure sessions
   */

  const
    Sessions = require('./lib/sessions'),
    sessions = new Sessions(api, maps, annotations)
  // sessions.on('message', message => api._logger.write(message))

  /**
   * Configure archives
   */

  const archives = require('./lib/archives')
  archives.setupArchives(api, maps, annotations, cells)

  /**
   * Configure groups & invitations
   */

  const Groups = require('./lib/groups'),
    groups = new Groups(api)

  const Invites = require('./lib/invites'),
    invites = new Invites(api, groups)

  await api.start()
}

setup().catch(err => {
  process.stderr.write(err.message + '\n')
  process.stderr.write(err.stack + '\n')
  process.exit(err.code)
})
