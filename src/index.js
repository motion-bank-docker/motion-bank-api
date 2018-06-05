const
  http = require('http'),
  polka = require('polka'),
  { json } = require('body-parser'),
  Primus = require('primus')

/**
 * HTTP server
 */
const
  { PORT = 3030, HOST = '0.0.0.0' } = process.env,
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
  Service = require('./service'),
  app = polka({ server })

app.use(json())

/**
 * Configure resources
 */
const annotations = new Service('annotations', app)
annotations.on('message', message => primus.write(message))

/**
 * Start server
 */
app.listen(PORT, HOST).then(() => winston.log('info', `API started on ${HOST}:${PORT}`))
