const
  config = require('config'),
  http = require('http'),
  polka = require('polka'),
  Primus = require('primus'),
  morgan = require('morgan'),
  cors = require('cors')({ origin: true }),
  jwt = require('express-jwt'),
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
    models = require('mbjs-data-models'),
    Service = require('./service'),
    app = polka({ server })

  const jwtCheck = jwt(ObjectUtil.merge({
    secret: jwks.expressJwtSecret(config.get('auth.jwks'))
  }, config.get('auth.jwt')))

  app.use(cors, jwtCheck, json(), morgan(process.env.NODE_ENV === 'production' ? 'common' : 'dev'))

  /**
   * Set up ACL
   */
  const
    setupACL = require('./acl'),
    acl = await setupACL(app)

  /**
   * Configure resources
   */
  const annotations = new Service('annotations', app, models.Annotation, winston, acl)
  annotations.on('message', message => primus.write(message))

  const maps = new Service('maps', app, models.Map, winston, acl)
  maps.on('message', message => primus.write(message))

  const documents = new Service('documents', app, models.Document, winston, acl)
  documents.on('message', message => primus.write(message))

  /**
   * Start server
   */
  app.listen(port, host).then(() => winston.log('info', `API started on ${host}:${port}`))
}

setup()
