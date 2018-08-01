const
  config = require('config'),
  send = require('@polka/send-type'),
  TinyEmitter = require('tiny-emitter'),
  { getMetaData } = require('mbjs-media/src/util/metadata')

const fetchMetaData = async (annotation, user, annotationsService) => {
  let meta
  try {
    meta = await getMetaData(annotation, async query => {
      const results = await annotationsService.findHandler({
        query: {
          query: JSON.stringify(query)
        },
        user
      })
      return results.data
    }, config.apiKeys)
  }
  catch (e) { console.error('fetchMetaData', e.message) }
  return meta
}

class Metadata extends TinyEmitter {
  constructor (app, annotationsService) {
    super()

    this._annotations = annotationsService

    const _this = this

    app.get('/metadata/:id', async (req, res) => {
      const result = await _this._annotations.getHandler(req)
      const annotation = result.data
      if (!annotation) return _this._errorResponse(res, 404)
      const metadata = await fetchMetaData(annotation, req.user, _this._annotations)
      if (!metadata) return _this._errorResponse(res, 404)
      _this._response(req, res, metadata)
    })
  }

  _response (req, res, data = {}) {
    this.emit('message', { method: req.method, id: data.uuid })
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

module.exports = Metadata
