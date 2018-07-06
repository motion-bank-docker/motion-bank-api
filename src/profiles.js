const
  config = require('config'),
  send = require('@polka/send-type'),
  TinyEmitter = require('tiny-emitter'),
  { ObjectUtil } = require('mbjs-utils'),
  { MongoDB } = require('mbjs-persistence')

class Profiles extends TinyEmitter {
  constructor (app) {
    super()

    // TODO: make db adapter configurable (nedb, etc.)
    this._client = new MongoDB(ObjectUtil.merge({ name: 'profiles', logger: console }, config.get('profiles.mongodb')), 'uuid')

    const _this = this

    app.get('/profiles/:id', async (req, res) => {
      const result = await this.client.get(req.params.id, req.params)
      if (result) {
        return _this._response(req, res, result)
      }
      send(res, 404)
    })

    app.put('/profiles/:id', async (req, res) => {
      const data = req.body
      let result = await this.client.get(req.params.id)
      if (result) {
        data.uuid = req.params.id
        result = await this.client.update(req.params.id, result, req.params)
        return _this._response(req, res, result)
      }
      send(res, 404)
    })

    app.patch('/profiles/:id', async (req, res) => {
      let existing = await this.client.get(req.params.id)
      if (existing) {
        existing = ObjectUtil.merge(existing, req.body)
        await this.client.update(req.params.id, existing, req.params)
        return _this._response(req, res, existing)
      }
      send(res, 404)
    })

    app.delete('/profiles/:id', async (req, res) => {
      let existing = await this.client.get(req.params.id)
      if (existing) {
        const result = await this.client.remove(req.params.id, req.params)
        if (result) {
          return _this._response(req, res, existing)
        }
      }
      send(res, 404)
    })
  }

  _response (req, res, data = {}) {
    this.emit('message', { method: req.method, id: data.id })
    send(res, 200, data)
  }

  get client () {
    return this._client
  }
}

module.exports = Profiles
