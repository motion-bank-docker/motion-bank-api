const
  config = require('config'),
  send = require('@polka/send-type'),
  TinyEmitter = require('tiny-emitter'),
  axios = require('axios')

class PBA extends TinyEmitter {
  constructor (api) {
    super()

    const _this = this

    api.app.get('/pba/pieces', (req, res) => _this.getPiecesHandler(req, res))
    api.app.get('/pba/pieces/:piece_id/titles', (req, res) => _this.getTitlesForPieceHandler(req, res))
  }

  async _performRequest (path) {
    const result = await axios.get(`${config.pba.baseUrl}/${path}`, { auth: config.pba.credentials })
    return result.data
  }

  async getPiecesHandler (req, res) {
    const result = await this._performRequest('pieces')
    this._response(req, res, result.pieces)
  }

  async getTitlesForPieceHandler (req, res) {
    const result = await this._performRequest(`titles/${req.params.piece_id}`)
    this._response(req, res, result.titles)
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
}

module.exports = PBA
