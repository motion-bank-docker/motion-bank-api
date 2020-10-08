const
  getTokenFromHeaders = require('mbjs-generic-api/src/util/get-token-from-headers'),
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

    api.app.post('/assets/:bucket', (req, res) => _this.postHandler(req, res))
    api.app.get('/assets/:bucket/*', (req, res) => _this.getHandler(req, res))
    api.app.get('/assets/:bucket', (req, res) => _this.getHandler(req, res))
    api.app.delete('/assets/:bucket/*', (req, res) => _this.deleteHandler(req, res))
  }

  async getHandler (req, res) {
    /** Extract object path */
    const
      parts = req.path.split('/'),
      object = parts.length >= 4 ? parts.splice(3).join('/') : undefined

    /** Check access permissions */
    let allowed = req.user && req.params.bucket === `user-${req.user.uuid}`
    if (!allowed) {
      try {
        allowed = await this.isAllowed(req, { id: req.path }, ['get'])
      }
      catch (err) {
        this.captureException(err)
      }
    }
    if (!allowed) return this._errorResponse(res, 403)

    /** Try to get metadata */
    const range = req.headers.range
    let metadata, hasRange = !!range
    try {
      metadata = await this.minio.statObject(req.params.bucket, object)
    }
    catch (err) {
      /** If object not found, assume it is a directory */
      if (!object || err.code === 'NotFound') {
        const
          _this = this,
          stream = this.minio.listObjects(req.params.bucket, object)

        let entries = []
        stream.on('error', err => {
          /** If list not found, return 404 */
          if (err.code === 'NotFound' || err.code === 'NoSuchBucket') _this._errorResponse(res, 404)
          else _this.captureException(err)
        })
        stream.on('data', data => {
          entries.push(data)
        })
        stream.on('end', async () => {
          /** Get metadata for entries */
          for (let entry of entries) {
            entry.metaData = {}
            try {
              const stat = await this.minio.statObject(req.params.bucket, entry.name)
              entry.metaData = stat.metaData
            }
            catch (e) { /* ignore error */ }
          }
          /** Return directory listing */
          _this._response(req, res, entries)
        })
      }
    }

    /** If metdata is found, set content-type and return object */
    if (metadata) {
      // FIXME: Ranges are broken when using @polka/send-type@0.5.2
      if (hasRange) {
        let { size } = metadata
        let [start, end] = range.replace(/bytes=/, '').split('-')
        start = parseInt(start, 10)
        end = end ? parseInt(end, 10) : size - 1

        if (isNaN(end)) end = size - 1
        if (isNaN(start)) start = size - end

        if (start >= size || end >= size || start >= end) {
          res.setHeader('Content-Range', `bytes */${size}`)
          return this._errorResponse(res, 416)
        }

        res.setHeader('Accept-Ranges', 'bytes')
        res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`)
        res.setHeader('Content-Length', end - start + 1)
        res.setHeader('Last-Modified', metadata.lastModified)
        res.setHeader('Content-Type', metadata.metaData ? metadata.metaData['content-type'] : 'application/octet-stream')

        const stream = await this.minio.getPartialObject(req.params.bucket, object, start, end - start + 1)
        return this._response(req, res, stream, 206)
      }

      if (req.query.dl) res.setHeader('Content-Type', 'application/force-download')
      else {
        res.setHeader('Content-Length', metadata.size)
        res.setHeader('Last-Modified', metadata.lastModified)
        res.setHeader('Content-Type', metadata.metaData ? metadata.metaData['content-type'] : 'application/octet-stream')
      }

      const stream = await this.minio.getObject(req.params.bucket, object)
      this._response(req, res, stream)
    }
  }

  async postHandler (req, res) {
    const
      _this = this,
      os = require('os'),
      path = require('path'),
      { ObjectUtil } = require('mbjs-utils'),
      multer = require('multer'),
      upload = multer({ dest: os.tmpdir() })

    if (!req.user) return this._errorResponse(res, 403)

    upload.single('file')(req, res, async () => {
      /** Only allow if user bucket and owner */
      if (req.params.bucket !== `user-${req.user.uuid}`) return this._errorResponse(res, 403)

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

      const
        extname = path.extname(req.file.originalname),
        slug = ObjectUtil.slug(path.basename(req.file.originalname, extname))

      let filename = `${slug}${extname.toLowerCase()}`
      if (req.body.basePath) {
        filename = path.join(req.body.basePath, filename)
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
        token: getTokenFromHeaders(req.headers),
        type: 'acl:allow'
      }
      await this.acl.send(payload)

      /** Return file info */
      this._response(req, res, {
        file: `${req.params.bucket}/${filename}`,
        originalName: req.file.originalname
      })
    })
  }

  async deleteHandler (req, res) {
    /** Only allow if user bucket and owner */
    if (req.params.bucket !== `user-${req.user.uuid}`) return this._errorResponse(res, 403)

    const object = req.path.split('/').splice(3).join('/')

    /** Remove object */
    await this.minio.removeObject(req.params.bucket, object)
    await this.acl.send({
      resources: [`${req.params.bucket}/${object}`],
      token: getTokenFromHeaders(req.headers),
      type: 'acl:clear'
    })

    this._response(req, res)
  }
}

module.exports = Assets
