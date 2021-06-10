const
  debug = require('debug')('assets'),
  sanitizeFilename = require('sanitize-filename'),
  getTokenFromHeaders = require('mbjs-generic-api/src/util/get-token-from-headers'),
  getTokenFromQuery = require('mbjs-generic-api/src/util/get-token-from-query'),
  Service = require('mbjs-generic-api/src/lib/service')

class Assets extends Service {
  constructor (api, config) {
    super('assets', api)

    const
      _this = this,
      Minio = require('minio'),
      opts = Object.assign({}, config.assets.client)

    opts.useSSL = !!config.assets.client.useSSL && (config.assets.client.useSSL === true || config.assets.client.useSSL === 'true')
    opts.port = config.assets.client.port ? parseInt(config.assets.client.port) : undefined

    _this.config = config
    _this.minio = new Minio.Client(opts)
    debug('Minio client initialised')

    api.app.post('/assets/:bucket', (req, res) => _this.postHandler(req, res))
    api.app.get('/assets/:bucket/*', (req, res) => _this.getHandler(req, res))
    api.app.get('/assets/:bucket', (req, res) => _this.getHandler(req, res))
    api.app.delete('/assets/:bucket/*', (req, res) => _this.deleteHandler(req, res))
  }

  async getHandler (req, res) {
    /** Extract object path */
    const
      parts = req.path.split('/'),
      object = parts.length >= 4 ? decodeURIComponent(parts.splice(3).join('/')) : undefined
    debug('getHandler: object path', object)
    debug('getHandler: req.params.bucket', req.params.bucket)
    debug('getHandler: user', req.user.uuid)

    /** Check access permissions */
    let allowed = req.user && req.params.bucket === `user-${req.user.uuid}`
    if (!allowed) {
      try {
        const id = req.path.substr('/assets/'.length)
        allowed = await this.isAllowed(req, { id }, ['get', 'view'])
        debug('getHandler: ACL allowed', allowed)
      }
      catch (err) {
        debug('getHandler: ACL error', err.message)
        this.captureException(err)
      }
    }
    if (!allowed) return this._errorResponse(res, 403)

    /** Try to get metadata */
    const range = req.headers.range
    let metadata, hasRange = !!range
    try {
      metadata = await this.minio.statObject(req.params.bucket, object)
      debug('getHandler: metadata', metadata)
    }
    catch (err) {
      /** If object not found, assume it is a directory */
      if (!object || err.code === 'NotFound') {
        const
          _this = this,
          stream = this.minio.listObjects(req.params.bucket, object)

        let entries = []
        stream.on('error', async err => {
          /** If the bucket does not exist, create it */
          if (err.code === 'NoSuchBucket') {
            try {
              await this.minio.makeBucket(req.params.bucket)
              debug('getHandler: created new bucket', req.params.bucket)
              return _this._response(req, res, [])
            }
            catch (err) {
              debug('getHandler: failed to create bucket', err.message())
              return _this.captureException(err)
            }
          }
          /** If list not found, return 404 */
          if (err.code === 'NotFound') return _this._errorResponse(res, 404)
          else _this.captureException(err)
        })
        stream.on('data', data => {
          debug('getHandler: listObjects data', data.name || data.prefix)
          entries.push(data)
        })
        stream.on('end', async () => {
          /** Get metadata for entries */
          for (let entry of entries) {
            entry.metaData = {}
            try {
              const stat = await this.minio.statObject(req.params.bucket, entry.name)
              entry.metaData = stat.metaData
              debug('getHandler: listObjects statObject size:', stat.size)
            }
            catch (err) {
              debug('getHandler: listObjects statObject error:', err.message)
            }
          }
          debug('getHandler: listObjects entries:', entries.length)
          /** Return directory listing */
          return _this._response(req, res, entries)
        })
      }
      else {
        debug('getHandler: metadata error', err)
        return this._errorResponse(res, err.code || 500, err.message)
      }
    }

    /** If metdata is found, set content-type and return object */
    if (metadata) {
      if (hasRange) {
        let { size } = metadata
        let [start, end] = range.replace(/bytes=/, '').split('-')
        start = parseInt(start, 10)
        end = end ? parseInt(end, 10) : size - 1

        if (isNaN(end)) end = size - 1
        if (isNaN(start)) start = size - end

        if (start >= size || end >= size || start >= end) {
          res.setHeader('Content-Range', `bytes */${size}`)
          debug('getHandler: Content-Range error')
          return this._errorResponse(res, 416)
        }

        res.writeHead(206, {
          'Accept-Ranges': 'bytes',
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Content-Length': end - start + 1,
          'Last-Modified': metadata.lastModified,
          'Content-Type': metadata.metaData ? metadata.metaData['content-type'] : 'application/octet-stream'
        })
        debug('getHandler: wrote head 206')

        const stream = await this.minio.getPartialObject(req.params.bucket, object, start, end - start + 1)
        debug('getHandler: getPartialObject stream:', typeof stream)
        return stream.pipe(res)
      }

      if (req.query.dl) res.setHeader('Content-Type', 'application/force-download')
      else {
        res.setHeader('Content-Length', metadata.size)
        res.setHeader('Last-Modified', metadata.lastModified)
        res.setHeader('Content-Type', metadata.metaData ? metadata.metaData['content-type'] : 'application/octet-stream')
        debug('getHandler: set head 200')
      }

      const stream = await this.minio.getObject(req.params.bucket, object)
      debug('getHandler: getObject stream:', typeof stream)
      return stream.pipe(res)
    }
  }

  async postHandler (req, res) {
    const
      _this = this,
      os = require('os'),
      path = require('path'),
      multer = require('multer'),
      upload = multer({ dest: os.tmpdir() })

    if (!req.user) return this._errorResponse(res, 403)

    upload.single('file')(req, res, async () => {
      /** Only allow if user bucket and owner */
      if (req.params.bucket !== `user-${req.user.uuid}`) return this._errorResponse(res, 403)

      /** Validation */
      const
        extname = path.extname(req.file.originalname),
        sanitized = sanitizeFilename(path.basename(req.file.originalname, extname))

      if (this.config.assets.typesWhitelist) {
        const typesWhitelist = this.config.assets.typesWhitelist.split(',')
        if (!typesWhitelist.includes(extname.toLowerCase().substr(1))) {
          return _this._errorResponse(res, 400)
        }
      }

      /** Sanitize input */
      let filename = `${sanitized}${extname.toLowerCase()}`
      if (req.body.basePath) {
        const basePath = req.body.basePath.split('/')
          .map(dir => sanitizeFilename(dir))
          .filter(dir => dir && !!dir.length)
          .join('/')
        filename = path.join(basePath, filename)
      }

      /** Check if bucket exists */
      const exists = await _this.minio.bucketExists(req.params.bucket)

      /** If no bucket exists, create one */
      if (!exists) {
        try {
          await _this.minio.makeBucket(req.params.bucket)
        }
        catch (err) {
          _this._captureException(err)
          return _this._errorResponse(res, 500)
        }
      }

      /** Put object */
      await _this.minio.fPutObject(
        req.params.bucket,
        filename,
        req.file.path,
        {
          'Content-Type': req.file.mimetype
        })

      const payload = {
        roles: [req.user.id],
        resources: [`${req.params.bucket}/${filename}`],
        permissions: ['get', 'put', 'delete'],
        token: getTokenFromHeaders(req.headers) || getTokenFromQuery(req.query),
        type: 'acl:allow'
      }
      await this.acl.send(payload)

      /** Return file info */
      return this._response(req, res, {
        file: `${req.params.bucket}/${filename}`,
        originalName: req.file.originalname
      })
    })
  }

  async deleteHandler (req, res) {
    /** Only allow if user bucket and owner */
    if (req.params.bucket !== `user-${req.user.uuid}`) return this._errorResponse(res, 403)

    const object = decodeURIComponent(req.path.split('/').splice(3).join('/'))

    /** Remove object */
    await this.minio.removeObject(req.params.bucket, object)
    await this.acl.send({
      resources: [`${req.params.bucket}/${object}`],
      token: getTokenFromHeaders(req.headers) || getTokenFromQuery(req.query),
      type: 'acl:clear'
    })

    return this._response(req, res)
  }
}

module.exports = Assets
