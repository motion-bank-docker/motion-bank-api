const
  config = require('config'),
  send = require('@polka/send-type'),
  TinyEmitter = require('tiny-emitter'),
  { ObjectUtil } = require('mbjs-utils'),
  { MongoDB } = require('mbjs-persistence')

class Service extends TinyEmitter {
  constructor (name, api, model) {
    super()

    const _this = this

    this._name = name
    this._captureException = api.captureException
    this._acl = api.acl
    this._logger = api.logger
    this._Model = model
    // TODO: make db adapter configurable (nedb, etc.)
    this._client = new MongoDB(ObjectUtil.merge({ name, logger: api.logger }, config.get('resources.mongodb')), 'uuid')

    api.app.get(`/${this._name}`, (req, res) => _this.findHandler(req, res))
    api.app.get(`/${this._name}/:id`, (req, res) => _this.getHandler(req, res))
    api.app.post(`/${this._name}`, (req, res) => _this.postHandler(req, res))
    api.app.put(`/${this._name}/:id`, (req, res) => _this.putHandler(req, res))
    api.app.patch(`/${this._name}/:id`, (req, res) => _this.patchHandler(req, res))
    api.app.delete(`/${this._name}/:id`, (req, res) => _this.deleteHandler(req, res))
  }

  async findHandler (req, res) {
    let results
    try {
      results = await this._client.find(JSON.parse(req.query.query || '{}'), req.params)
    }
    catch (err) {
      this._captureException(err)
      return this._errorResponse(res, 500)
    }
    const userId = req.user ? req.user.uuid : 'anon'
    const roles = req.user ? req.user.profile.roles : ['public']
    const items = []
    for (let entry of results) {
      let allowed = false
      if (req.user && entry.author && entry.author.id === userId) allowed = true
      else {
        try {
          allowed = await this._acl.areAnyRolesAllowed(roles, entry.uuid, ['get'])
        }
        catch (err) {
          this._captureException(err)
        }
      }
      if (allowed) items.push(entry)
    }
    return this._response(req, res, { items })
  }

  async getHandler (req, res) {
    let result
    try {
      result = await this.client.get(req.params.id, req.params)
    }
    catch (err) {
      this._captureException(err)
      return this._errorResponse(res, 500)
    }
    const roles = req.user ? req.user.profile.roles : ['public']
    if (result) {
      let allowed = false
      if (req.user && result.author && result.author.id === req.user.uuid) allowed = true
      else {
        try {
          allowed = await this._acl.areAnyRolesAllowed(['public'].concat(roles), result.uuid, ['get'])
        }
        catch (err) {
          this._captureException(err)
        }
      }
      if (allowed) {
        const instance = new this.ModelConstructor(result, `${req.params.id}`)
        return this._response(req, res, instance)
      }
      return this._errorResponse(res, 403)
    }
    else return this._errorResponse(res, 404)
  }

  async postHandler (req, res) {
    const
      ctx = this,
      data = req.body
    if (Array.isArray(data)) {
      try {
        const results = await Promise.all(data.map(entry => {
          return ctx.create(entry, req.params)
        }))
        return this._response(req, res, results)
      }
      catch (err) {
        this._captureException(err)
        return this._errorResponse(res, 500)
      }
    }
    // TODO: allow for full array inserts instead just single requests
    // TODO: throw bad request error / validate input
    try {
      const instance = new this.ModelConstructor(data),
        result = await this.client.create(instance, req.params)
      instance.populate(result)
      this._response(req, res, instance)
    }
    catch (err) {
      this._captureException(err)
      this._errorResponse(res, 500)
    }
  }

  async putHandler (req, res) {
    const data = req.body
    let result
    try {
      result = await this.client.get(req.params.id)
    }
    catch (err) {
      this._captureException(err)
      return this._errorResponse(res, 500)
    }
    if (result) {
      // TODO: transactions anyone?!
      if (req.user.uuid !== result.author.id) return this._errorResponse(res, 403)
      data.uuid = req.params.id
      try {
        let instance = new this.ModelConstructor(data, req.params.id)
        await this.client.update(req.params.id, instance, req.params)
        return this._response(req, res, instance)
      }
      catch (err) {
        this._captureException(err)
        this._errorResponse(res, 500)
      }
    }
    else return this._errorResponse(res, 404)
  }

  async patchHandler (req, res) {
    const data = req.body
    let existing
    try {
      existing = await this.client.get(req.params.id)
    }
    catch (err) {
      this._captureException(err)
      return this._errorResponse(res, 500)
    }
    if (existing) {
      if (req.user.uuid !== existing.author.id) return this._errorResponse(res, 403)
      try {
        let instance = new this.ModelConstructor(existing, req.params.id)
        instance.populate(ObjectUtil.merge(instance.toObject(), data))
        await this.client.update(req.params.id, instance, req.params)
        return this._response(req, res, instance)
      }
      catch (err) {
        this._captureException(err)
        this._errorResponse(res, 500)
      }
    }
    else return this._errorResponse(res, 404)
  }

  async deleteHandler (req, res) {
    let existing
    try {
      existing = await this.client.get(req.params.id)
    }
    catch (err) {
      this._captureException(err)
      return this._errorResponse(res, 500)
    }
    if (existing) {
      if (req.user.uuid !== existing.author.id) return this._errorResponse(res, 403)
      try {
        const result = await this.client.remove(req.params.id, req.params)
        if (result) {
          return this._response(req, res, existing)
        }
      }
      catch (err) {
        this._captureException(err)
        this._errorResponse(res, 500)
      }
    }
    else return this._errorResponse(res, 404)
  }

  _response (req, res, data = {}) {
    this.emit('message', { method: req.method, id: data.id })
    if (typeof res === 'function') res({ data })
    else if (typeof res === 'undefined') return Promise.resolve({ data })
    else send(res, 200, data)
  }

  _errorResponse (res, code, message = undefined) {
    if (typeof res === 'function') res({ error: true, code })
    else if (typeof res === 'undefined') return Promise.resolve({ error: true, code })
    else send(res, code, message)
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
