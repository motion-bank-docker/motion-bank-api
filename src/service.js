const
  send = require('@polka/send-type'),
  TinyEmitter = require('tiny-emitter')

class Service extends TinyEmitter {
  constructor (name, app) {
    super()

    this._name = name

    const _this = this

    app.get(`/${this._name}.json`, (req, res) => {
      _this._response(req, res, [{ hello: 'world' }])
    })

    app.get(`/${this._name}/:id.json`, (req, res) => {
      _this._response(req, res, { hello: 'world' })
    })

    app.post(`/${this._name}.json`, (req, res) => {
      const data = req.body
      _this._response(req, res, data)
    })

    app.put(`/${this._name}/:id.json`, (req, res) => {
      const data = req.body
      _this._response(req, res, data)
    })

    app.patch(`/${this._name}/:id.json`, (req, res) => {
      const data = req.body
      _this._response(req, res, data)
    })

    app.delete(`/${this._name}/:id.json`, (req, res) => {
      const data = req.body
      _this._response(req, res, data)
    })
  }

  _response (req, res, data = {}) {
    this.emit('message', { method: req.method, id: data.id })
    send(res, 200, data)
  }
}

module.exports = Service
