const
  config = require('config'),
  send = require('@polka/send-type'),
  TinyEmitter = require('tiny-emitter'),
  axios = require('axios'),
  getHeaders = require('./util/get-headers')

class Manage extends TinyEmitter {
  constructor (api) {
    super()

    const _this = this
    this.config = config.auth.admin

    const filterAttributes = (source, isUpdate = false) => {
      return {
        user_id: source.user_id,
        email: source.email,
        password: source.password,
        nickname: source.nickname,
        name: source.name,
        user_metadata: source.user_metadata,
        app_metadata: isUpdate ? undefined : source.app_metadata
      }
    }

    const isAdmin = req => {
      return Array.isArray(req.user.profile.roles) && req.user.profile.roles.indexOf('admin') > -1
    }

    api.app.get('/manage', async (req, res) => {
      if (!isAdmin(req)) return send(res, 403)

      const headers = await getHeaders(_this)
      try {
        let pagination = {}
        const filter = req.query.filter
        if (req.query.pagination) pagination = JSON.parse(req.query.pagination)
        const q = `identities.connection:"${_this.config.connection}"`
        const query = {
          page: pagination.page ? pagination.page - 1 : 0,
          per_page: pagination.rowsPerPage || 10,
          include_totals: true,
          search_engine: 'v3',
          q: q + (filter ? ` AND email:${filter}*` : ''),
          sort: `${pagination.sortBy || 'email'}:${pagination.descending ? -1 : 1}`
        }
        const result = await axios.get(`${_this.config.apiEndpoint}users`, { headers, params: query })
        send(res, 200, result.data)
      }
      catch (err) {
        if (err.response) send(res, err.response.status)
        else {
          console.error(`GET /manage`, err.message)
          send(res, 500)
        }
      }
    })

    api.app.get('/manage/:id', async (req, res) => {
      if (!req.user || (!isAdmin(req) && req.params.id !== req.user.sub)) {
        return send(res, 403)
      }

      const headers = await getHeaders(_this)
      try {
        const result = await axios.get(`${_this.config.apiEndpoint}users/${req.params.id}`, { headers })
        send(res, 200, isAdmin(req) ? result.data : filterAttributes(result.data))
      }
      catch (err) {
        if (err.response) send(res, err.response.status)
        else {
          console.error(`GET /manage/${req.params.id}`, err.message)
          send(res, 500)
        }
      }
    })

    api.app.post('/manage', async (req, res) => {
      if (!isAdmin(req)) return send(res, 403)

      req.body.creator = undefined
      req.body.connection = _this.config.connection

      const headers = await getHeaders(_this)
      try {
        const result = await axios.post(
          `${_this.config.apiEndpoint}users`,
          req.body,
          { headers })
        send(res, 200, result.data)
      }
      catch (err) {
        if (err.response) send(res, err.response.status, err.response.data)
        else {
          console.error(`POST /manage/${req.params.id}`, err.message)
          send(res, 500)
        }
      }
    })

    api.app.put('/manage/:id', async (req, res) => {
      if (!isAdmin(req)) {
        return send(res, 403)
      }

      const headers = await getHeaders(_this)
      try {
        const result = await axios.put(
          `${_this.config.apiEndpoint}users/${req.params.id}`, req.body, { headers })
        send(res, 200, result.data)
      }
      catch (err) {
        if (err.response) send(res, err.response.status, err.response.data)
        else {
          console.error(`PUT /manage/${req.params.id}`, err.message)
          send(res, 500)
        }
      }
    })

    api.app.patch('/manage/:id', async (req, res) => {
      if (!req.user || (!isAdmin(req) && req.params.id !== req.user.sub)) {
        return send(res, 403)
      }

      const headers = await getHeaders(_this)
      try {
        const payload = isAdmin(req) ? req.body : filterAttributes(req.body, true)
        const result = await axios.patch(
          `${_this.config.apiEndpoint}users/${req.params.id}`,
          payload,
          { headers })
        send(res, 200, isAdmin(req) ? result.data : filterAttributes(result.data, true))
      }
      catch (err) {
        if (err.response) send(res, err.response.status, err.response.data)
        else {
          console.error(`PATCH /manage/${req.params.id}`, err.message)
          send(res, 500)
        }
      }
    })

    api.app.delete('/manage/:id', async (req, res) => {
      if (!isAdmin(req)) {
        return send(res, 403)
      }

      const headers = await getHeaders(_this)
      try {
        const result = await axios.delete(`${_this.config.apiEndpoint}users/${req.params.id}`, { headers })
        send(res, 200, isAdmin(req) ? result.data : filterAttributes(result.data))
      }
      catch (err) {
        if (err.response) send(res, err.response.status)
        else {
          console.error(`GET /manage/${req.params.id}`, err.message)
          send(res, 500)
        }
      }
    })
  }
}

module.exports = Manage
