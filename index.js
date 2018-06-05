const
  http = require('http'),
  polka = require('polka'),
  Primus = require('primus'),
  winston = require('winston')

const
  port = process.env.PORT || 3030,
  host = process.env.HOST || '0.0.0.0',
  server = http.createServer(),
  primus = new Primus(server, { transformer: 'uws' }),
  app = polka({ server })

primus.on('connection', spark => {
  winston.log('debug', `Spark ${spark.id} connected with address ${spark.address}`)
})

primus.on('disconnection', spark => {
  winston.log('debug', `Spark ${spark.id} disconnected with address ${spark.address}`)
})

app.get('/annotations.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({ test: 'asdf' }))
})

app.listen(port, host).then(() => winston.log('info', `API started on ${host}:${port}`))
