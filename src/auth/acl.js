const
  Acl = require('acl'),
  config = require('config'),
  Backend = Acl.mongodbBackend,
  MongoClient = require('mongodb').MongoClient,
  send = require('@polka/send-type')

const setupACL = async function (app) {
  const cfg = config.get('acl.mongodb')
  cfg.logger = console

  const db = await new Promise((resolve, reject) => {
    MongoClient.connect(cfg.url, function (err, client) {
      if (err) return reject(err)
      cfg.logger.info(`ACL connected at ${cfg.url}/${cfg.dbName}`)
      const db = client.db(cfg.dbName)
      resolve(db)
    })
  })

  const acl = new Acl(new Backend(db))

  /**
   * Manage permissions
   */

  app.get('/acl/:role/:resource', (req, res, next) => {
    acl.allowedPermissions(req.params.role, req.params.resource, (err, result) => {
      if (err) next(err)
      else if (result) send(res, 200, result)
      else send(res, 404)
    })
  })

  app.put('/acl/:role/:resource', (req, res, next) => {
    acl.allow(req.params.role, req.params.resource, req.body, err => {
      if (err) next(err)
      else send(res, 200)
    })
  })

  /**
   * Manage roles
   */

  app.get('/acl/:userId/roles', (req, res, next) => {
    acl.userRoles(req.params.userId, (err, result) => {
      if (err) next(err)
      else send(res, 200, result)
    })
  })

  app.post('/acl/:userId/roles', (req, res, next) => {
    acl.addUserRoles(req.params.userId, req.body, err => {
      if (err) next(err)
      else send(res, 200)
    })
  })

  app.delete('/acl/:userId/roles', (req, res, next) => {
    acl.removeUserRoles(req.params.userId, req.body, err => {
      if (err) next(err)
      else send(res, 200)
    })
  })

  return acl
}

module.exports = setupACL
