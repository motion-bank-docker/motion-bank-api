const
  config = require('config'),
  send = require('@polka/send-type'),
  TinyEmitter = require('tiny-emitter'),
  constants = require('mbjs-data-models/src/constants'),
  { ObjectUtil } = require('mbjs-utils'),
  { Sorting } = require('mbjs-data-models/src/lib'),
  axios = require('axios'),
  { DateTime } = require('luxon')

class SessionHelpers {
  static annotationToSessionTime (seconds, annotation, session) {
    const offset = (session.start.toMillis() - annotation.target.selector.value.start.toMillis()) * 0.001
    return offset + seconds
  }
}

const resurrectAnnotation = function (annotation) {
  if (typeof annotation.created === 'string') annotation.created = DateTime.fromISO(annotation.created)
  if (typeof annotation.updated === 'string') annotation.updated = DateTime.fromISO(annotation.updated)
  if (annotation.target && annotation.target.selector) {
    if (typeof annotation.target.selector.value === 'string') {
      annotation.target.selector.value = DateTime.fromISO(annotation.target.selector.value)
    }
  }
  return annotation
}

const fetchMetaData = async (videos, req) => {
  for (let v of videos) {
    try {
      const meta = await axios.get(`${config.api.transcoderHost}/metadata/${v.annotation.uuid}`, {
        headers: {
          Authorization: req.headers.authorization
        }
      })
      Object.assign(v.meta, meta.data)
    }
    catch (e) { console.error('fetchMetaData', e.message, e.stack) }
  }
  return videos
}

const groupBySessions = async function (annotations, req, secondsDist = constants.SESSION_DISTANCE_SECONDS) {
  let millisDist = secondsDist * 1000
  annotations = annotations.map(annotation => resurrectAnnotation(annotation)).sort(Sorting.sortOnTarget)
  const videos = annotations.filter(anno => { return anno.body.type === 'Video' })
    .map(annotation => {
      return {
        meta: {},
        annotation: annotation
      }
    })
  await fetchMetaData(videos, req)
  annotations = annotations.filter(anno => { return anno.body.type === 'TextualBody' })
  const sessions = []
  const defaultSession = { start: undefined, end: undefined, duration: undefined, annotations: [] }
  let lastDatetime, session = ObjectUtil.merge({}, defaultSession)
  for (let i = 0; i < annotations.length; i++) {
    const a = annotations[i]
    const select = a.target.selector.value.start
    if (!session.start) {
      session.start = select
    }
    let duration = select.toMillis() - session.start.toMillis()
    if (lastDatetime) {
      const dist = select.toMillis() - lastDatetime.toMillis()
      if (dist >= millisDist || i === annotations.length - 1) {
        session.end = select
        session.duration = (session.end.toMillis() - session.start.toMillis()) * 0.001 // TimelineSelector.timeBetween(, ).as('seconds')
        videos.forEach(video => {
          // FIXME: end value stays wrong
          const s = SessionHelpers.annotationToSessionTime(video.meta.duration, video.annotation, session)
          session.duration = Math.max(session.duration, s)
        })
        if (isNaN(session.duration)) {
          console.error('duration NaN', session)
          session.duration = 0
        }
        session.annotations.push({ annotation: a, duration, active: false })
        sessions.push(session)
        session = ObjectUtil.merge({}, defaultSession)
      }
      else {
        session.annotations.push({ annotation: a, duration, active: false })
      }
    }
    else session.annotations.push({ annotation: a, duration, active: false })
    lastDatetime = select
  }
  return { sessions, videos }
}

class Sessions extends TinyEmitter {
  constructor (app, mapsService, annotationsService) {
    super()

    this._maps = mapsService
    this._annotations = annotationsService

    const _this = this

    app.get('/sessions/:id', async (req, res) => {
      let results = await _this._maps.getHandler(req)
      const map = results.data
      if (!map) return _this._errorResponse(res, 404)
      results = await _this._annotations.findHandler({
        query: {
          query: JSON.stringify({
            'target.id': `${config.api.uriBase}/piecemaker/timelines/${map.uuid}`
          })
        },
        user: req.user,
        headers: req.headers
      })
      let annotations = results.data.items
      const sessions = await groupBySessions(annotations, req)
      _this._response(req, res, sessions)
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

module.exports = Sessions
