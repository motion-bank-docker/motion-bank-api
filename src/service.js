const
  config = require('config'),
  send = require('@polka/send-type'),
  TinyEmitter = require('tiny-emitter'),
  { ObjectUtil } = require('mbjs-utils'),
  { MongoDB } = require('mbjs-persistence')

class Service extends TinyEmitter {
  constructor (name, app, model, logger, acl) {
    super()

    this._name = name
    this._acl = acl
    this._Model = model
    // TODO: make db adapter configurable (nedb, etc.)
    this._client = new MongoDB(ObjectUtil.merge({ name, logger }, config.get('resources.mongodb')), 'uuid')

    const _this = this

    app.get(`/${this._name}`, async (req, res) => {
      const results = await this.client.find(JSON.parse(req.params.query || '{}'), req.params)
      _this._response(req, res, { items: results })
    })

    app.get(`/${this._name}/:id`, async (req, res) => {
      const result = await this.client.get(req.params.id, req.params)
      if (result) {
        const instance = new this.ModelConstructor(result, `${req.params.id}`)
        return _this._response(req, res, instance)
      }
      send(res, 404)
    })

    app.post(`/${this._name}`, async (req, res) => {
      const
        ctx = this,
        data = req.body
      if (Array.isArray(data)) {
        const results = await Promise.all(data.map(entry => {
          return ctx.create(entry, req.params)
        }))
        return _this._response(req, res, results)
      }
      // TODO: allow for full array inserts instead just single requests
      const instance = new this.ModelConstructor(data),
        result = await this.client.create(instance, req.params)
      instance.populate(result)
      _this._response(req, res, instance)
    })

    app.put(`/${this._name}/:id`, async (req, res) => {
      const data = req.body
      let result = await this.client.get(req.params.id)
      if (result) {
        // TODO: transactions anyone?!
        data.uuid = req.params.id
        let instance = new this.ModelConstructor(data, req.params.id)
        result = await this.client.update(req.params.id, instance, req.params)
        return _this._response(req, res, instance)
      }
      send(res, 404)
    })

    app.patch(`/${this._name}/:id`, async (req, res) => {
      const data = req.body
      let existing = await this.client.get(req.params.id)
      if (existing) {
        let instance = new this.ModelConstructor(existing, req.params.id)
        instance.populate(ObjectUtil.merge(instance.toObject(), data))
        await this.client.update(req.params.id, instance, req.params)
        return _this._response(req, res, instance)
      }
      send(res, 404)
    })

    app.delete(`/${this._name}/:id`, async (req, res) => {
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

  get acl () {
    return this._acl
  }

  get ModelConstructor () {
    return this._Model
  }
}

module.exports = Service
