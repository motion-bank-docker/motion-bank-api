const
  config = require('config'),
  GenericAPI = require('mbjs-generic-api'),
  { version } = require('../package.json')

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

  const annotations = new Service('annotations', api, models.Annotation)
  // annotations.on('message', message => api._sockets.write(message))

  const maps = new Service('maps', api, models.Map)
  // maps.on('message', message => api._sockets.write(message))

  const cells = new Service('cells', api, models.Cell)
  // cells.on('message', message => api._sockets.write(message))

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

  await api.start()
}

setup().catch(err => {
  process.stderr.write(err.message + '\n')
  process.stderr.write(err.stack + '\n')
  process.exit(err.code)
})
