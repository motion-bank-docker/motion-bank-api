const
  config = require('config'),
  path = require('path'),
  http = require('http'),
  polka = require('polka'),
  Primus = require('primus'),
  morgan = require('morgan'),
  cors = require('cors')({ origin: true }),
  send = require('@polka/send-type'),
  jwt = require('express-jwt'),
  favicon = require('serve-favicon'),
  jwks = require('jwks-rsa'),
  { json } = require('body-parser'),
  { ObjectUtil } = require('mbjs-utils')

const setup = async function () {
  /**
   * HTTP server
   */
  const
    host = config.get('http.host'),
    port = config.get('http.port'),
    server = http.createServer()

  /**
   * Logger
   */
  const winston = require('winston')
  winston.level = process.env.NODE_ENV === 'production' ? 'error' : 'info'
  winston.level = process.env.LOG_LEVEL || winston.level

  /**
   * Set up WebSockets (Primus)
   */
  const primus = new Primus(server, { transformer: 'uws' })

  primus.on('connection', spark => {
    winston.log('debug', `Spark ${spark.id} connected with address ${spark.address}`)
  })

  primus.on('disconnection', spark => {
    winston.log('debug', `Spark ${spark.id} disconnected with address ${spark.address}`)
  })

  /**
   * Setup API server (Polka)
   */
  const
    app = polka({
      server,
      onError (err, req, res, next) {
        send(res, err.status || 500, { code: err.code })
      }
    })

  app.use(favicon(path.join(__dirname, '..', 'assets', 'favicon.ico')))

  const jwtCheck = jwt(ObjectUtil.merge({
    secret: jwks.expressJwtSecret(config.get('auth.jwks'))
  }, config.get('auth.jwt')))

  app.use(cors, jwtCheck, json(), morgan(process.env.NODE_ENV === 'production' ? 'common' : 'dev'))

  /**
   * Add proxy
   */
  const proxy = require('./middleware/proxy')
  proxy(app)

  /**
   * Set up ACL
   */
  const
    setupACL = require('./auth/acl'),
    acl = await setupACL(app)

  /**
   * Middleware
   */
  const addUserUUID = require('./middleware/user')
  addUserUUID(app)

  /**
   * Configure Profiles
   */
  const
    Profiles = require('./profiles'),
    profiles = new Profiles(app)
  profiles.on('message', message => winston.debug(message))

  const addAuthor = require('./middleware/author')
  addAuthor(app, profiles)

  /**
   * Configure resources
   */
  const
    models = require('mbjs-data-models'),
    Service = require('./service')

  const annotations = new Service('annotations', app, models.Annotation, winston, acl)
  annotations.on('message', message => primus.write(message))

  const maps = new Service('maps', app, models.Map, winston, acl)
  maps.on('message', message => primus.write(message))

  const documents = new Service('documents', app, models.Document, winston, acl)
  documents.on('message', message => primus.write(message))

  /**
   * Configure metadata
   */

  const
    Metadata = require('./metadata'),
    metadata = new Metadata(app, annotations)
  metadata.on('message', message => primus.write(message))

  /**
   * Configure sessions
   */

  const
    Sessions = require('./sessions'),
    sessions = new Sessions(app, maps, annotations)
  sessions.on('message', message => primus.write(message))

  /**
   * Configure archives
   */

  const archives = require('./archives')
  archives.setupArchives(app, maps, annotations)

  /**
   * Start server
   */
  return app.listen(port, host).then(() => winston.info(`API started on ${host}:${port}`))
}

setup().catch(err => {
  process.stderr.write(err.message + '\n')
  process.stderr.write(err.stack + '\n')
  process.exit(err.code)
})
