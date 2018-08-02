const GenericAPI = require('mbjs-generic-api')

const setup = async function () {
  const api = new GenericAPI()
  await api.setup()

  /**
   * Configure Profiles
   */
  const
    Profiles = require('./lib/profiles'),
    profiles = new Profiles(api._app)
  // profiles.on('message', message => api._logger.debug(message))

  const addAuthor = require('./middleware/author')
  addAuthor(api._app, profiles)

  /**
   * Configure resources
   */
  const
    models = require('mbjs-data-models'),
    Service = require('./lib/service')

  const annotations = new Service('annotations', api._app, models.Annotation, api._logger, api._acl)
  // annotations.on('message', message => api._sockets.write(message))

  const maps = new Service('maps', api._app, models.Map, api._logger, api._acl)
  // maps.on('message', message => api._sockets.write(message))

  // const documents = new Service('documents', api._app, models.Document, api._logger, api._acl)
  // documents.on('message', message => api._sockets.write(message))

  /**
   * Configure sessions
   */

  const
    Sessions = require('./lib/sessions'),
    sessions = new Sessions(api._app, maps, annotations)
  // sessions.on('message', message => api._logger.write(message))

  /**
   * Configure archives
   */

  const archives = require('./lib/archives')
  archives.setupArchives(api._app, maps, annotations)

  await api.start()
}

setup().catch(err => {
  process.stderr.write(err.message + '\n')
  process.stderr.write(err.stack + '\n')
  process.exit(err.code)
})
