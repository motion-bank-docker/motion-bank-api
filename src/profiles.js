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
      const results = await this.client.find({ user: req.params.id }, req.params)
      if (results.length) {
        return _this._response(req, res, results[0])
      }
      send(res, 404)
    })

    app.post('/profiles', async (req, res) => {
      req.body.uuid = ObjectUtil.uuid4()
      const result = await this.client.create(req.body)
      if (result) {
        return _this._response(req, res, result)
      }
      send(res, 404)
    })

    app.put('/profiles/:id', async (req, res) => {
      req.body._id = undefined
      req.body.uuid = undefined
      req.body.user = undefined
      const data = req.body
      let results = await this.client.find({ user: req.params.id }, req.params)
      if (results.length) {
        data.uuid = results[0].uuid
        results = await this.client.update(data.uuid, data, req.params)
        return _this._response(req, res, results)
      }
      send(res, 404)
    })

    app.patch('/profiles/:id', async (req, res) => {
      let results = await this.client.find({ user: req.params.id }, req.params)
      req.body._id = undefined
      req.body.uuid = undefined
      req.body.user = undefined
      const copy = {}
      Object.keys(req.body).forEach(key => {
        if (req.body[key]) copy[key] = req.body[key]
      })
      if (results.length) {
        results = ObjectUtil.merge(results[0], copy)
        await this.client.update(results.uuid, results, req.params)
        return _this._response(req, res, results)
      }
      send(res, 404)
    })

    app.delete('/profiles/:id', async (req, res) => {
      let results = await this.client.find({ user: req.params.id }, req.params)
      if (results.length) {
        results = await this.client.remove(results[0].uuid, req.params)
        if (results) {
          return _this._response(req, res, results)
        }
      }
      send(res, 404)
    })
  }

  _response (req, res, data = {}) {
    this.emit('message', { method: req.method, id: data.user })
    send(res, 200, data)
  }

  get client () {
    return this._client
  }
}

module.exports = Profiles
