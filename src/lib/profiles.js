const
  config = require('config'),
  send = require('@polka/send-type'),
  TinyEmitter = require('tiny-emitter'),
  { ObjectUtil } = require('mbjs-utils'),
  { MongoDB } = require('mbjs-persistence')

class Profiles extends TinyEmitter {
  constructor (api) {
    super()

    // TODO: make db adapter configurable (nedb, etc.)
    this._client = new MongoDB(ObjectUtil.merge({ name: 'profiles', logger: console }, config.get('profiles.mongodb')), 'uuid')

    const _this = this
    this._api = api

    api.app.get('/profiles/:id', (req, res) => _this.getHandler(req, res))

    api.app.post('/profiles', async (req, res) => {
      req.body.uuid = ObjectUtil.uuid4()
      let result
      try {
        result = await this.client.create(req.body)
      }
      catch (err) {
        api.captureException(err)
        return _this._errorResponse(res, 500)
      }
      if (result) {
        return _this._response(req, res, result)
      }
      send(res, 404)
    })

    api.app.put('/profiles/:id', async (req, res) => {
      req.body._id = undefined
      req.body.uuid = undefined
      req.body.user = undefined
      const data = req.body
      let results
      try {
        results = await this.client.find({ user: req.params.id })
      }
      catch (err) {
        api.captureException(err)
        return _this._errorResponse(res, 500)
      }
      if (results.length) {
        data.uuid = results[0].uuid
        results = await this.client.update(data.uuid, data)
        return _this._response(req, res, results)
      }
      send(res, 404)
    })

    api.app.patch('/profiles/:id', async (req, res) => {
      let results
      try {
        results = await this.client.find({user: req.params.id})
      }
      catch (err) {
        api.captureException(err)
        return _this._errorResponse(res, 500)
      }
      req.body._id = undefined
      req.body.uuid = undefined
      req.body.user = undefined
      const copy = {}
      Object.keys(req.body).forEach(key => {
        if (req.body[key]) copy[key] = req.body[key]
      })
      if (results.length) {
        results = ObjectUtil.merge(results[0], copy)
        try {
          await this.client.update(results.uuid, results)
        }
        catch (err) {
          api.captureException(err)
          return _this._errorResponse(res, 500)
        }
        return _this._response(req, res, results)
      }
      send(res, 404)
    })

    api.app.delete('/profiles/:id', async (req, res) => {
      let results
      try {
        results = await this.client.find({user: req.params.id})
      }
      catch (err) {
        api.captureException(err)
        return _this._errorResponse(res, 500)
      }
      if (results.length) {
        try {
          results = await this.client.remove(results[0].uuid)
        }
        catch (err) {
          api.captureException(err)
          return _this._errorResponse(res, 500)
        }
        if (results) {
          return _this._response(req, res, results)
        }
      }
      send(res, 404)
    })
  }

  async getHandler (req, res) {
    let results
    try {
      results = await this._client.find({user: req.params.id})
    }
    catch (err) {
      this._api.captureException(err)
      return this._errorResponse(res, 500)
    }
    if (results.length) {
      return this._response(req, res, results[0])
    }
    this._errorResponse(res, 404)
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
}

module.exports = Profiles
