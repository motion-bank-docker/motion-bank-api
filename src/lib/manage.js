const
  config = require('config'),
  send = require('@polka/send-type'),
  TinyEmitter = require('tiny-emitter'),
  axios = require('axios'),
  { ObjectUtil } = require('mbjs-utils')

class Manage extends TinyEmitter {
  constructor (api) {
    super()

    const _config = config.auth.admin
    this._config = _config

    let credentials

    const filterAttributes = (source, isUpdate = false) => {
      return {
        user_id: source.user_id,
        email: source.email,
        nickname: source.nickname,
        name: source.name,
        user_metadata: source.user_metadata,
        app_metadata: isUpdate ? undefined : source.app_metadata
      }
    }

    const getCredentials = async function () {
      const result = await axios.post(
        _config.tokenEndpoint,
        {
          client_id: _config.clientId,
          client_secret: _config.clientSecret,
          audience: _config.audience,
          grant_type: 'client_credentials'
        },
        {
          headers: { 'content-type': 'application/json' }
        }
      )
      return ObjectUtil.merge({
        expires_at: Date.now() + result.data.expires_in * 1000
      }, result.data)
    }

    const getHeaders = async function () {
      if (!credentials || credentials.expires_at < Date.now()) {
        credentials = await getCredentials()
      }
      return {
        Authorization: `${credentials.token_type} ${credentials.access_token}`
      }
    }

    const isAdmin = req => {
      return Array.isArray(req.user.profile.roles) && req.user.profile.roles.indexOf('admin') > -1
    }

    api.app.get('/manage', async (req, res) => {
      if (!isAdmin(req)) {
        return send(res, 403)
      }

      const headers = await getHeaders()
      try {
        let pagination = {}
        const filter = req.query.filter
        if (req.query.pagination) pagination = JSON.parse(req.query.pagination)
        const q = `identities.connection:"${_config.connection}"`
        const query = {
          page: pagination.page ? pagination.page - 1 : 0,
          per_page: pagination.rowsPerPage || 10,
          include_totals: true,
          search_engine: 'v3',
          q: q + (filter ? ` AND email:${filter}*` : ''),
          sort: `${pagination.sortBy || 'email'}:${pagination.descending ? -1 : 1}`
        }
        const result = await axios.get(`${_config.apiEndpoint}users`, { headers, params: query })
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
      if (!req.user || (!isAdmin(req) && req.params.id !== req.user.id)) {
        return send(res, 403)
      }

      const headers = await getHeaders()
      try {
        const result = await axios.get(`${_config.apiEndpoint}users/${req.params.id}`, { headers })
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

      const headers = await getHeaders()
      try {
        const result = await axios.post(
          `${_config.apiEndpoint}users`,
          req.body,
          { headers })
        send(res, 200, result.data)
      }
      catch (err) {
        if (err.response) send(res, err.response.status)
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

      const headers = await getHeaders()
      try {
        const result = await axios.put(
          `${_config.apiEndpoint}users/${req.params.id}`, req.body, { headers })
        send(res, 200, result.data)
      }
      catch (err) {
        if (err.response) send(res, err.response.status)
        else {
          console.error(`PUT /manage/${req.params.id}`, err.message)
          send(res, 500)
        }
      }
    })

    api.app.patch('/manage/:id', async (req, res) => {
      if (!req.user || (!isAdmin(req) && req.params.id !== req.user.id)) {
        return send(res, 403)
      }

      const headers = await getHeaders()
      try {
        const result = await axios.patch(
          `${_config.apiEndpoint}users/${req.params.id}`,
          isAdmin(req) ? req.body : filterAttributes(req.body, true),
          { headers })
        send(res, 200, isAdmin(req) ? result.data : filterAttributes(result.data, true))
      }
      catch (err) {
        if (err.response) send(res, err.response.status)
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

      const headers = await getHeaders()
      try {
        const result = await axios.delete(`${_config.apiEndpoint}users/${req.params.id}`, { headers })
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
