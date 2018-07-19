const
  Acl = require('acl'),
  config = require('config'),
  Backend = Acl.mongodbBackend,
  { MongoDB } = require('mbjs-persistence'),
  send = require('@polka/send-type')

const setupACL = async function (app) {
  const cfg = config.get('acl.mongodb')
  cfg.logger = console
  const client = new MongoDB(cfg, 'uuid')
  await client.connect()
  const acl = new Acl(new Backend(client.db.s.db, cfg.prefix))

  /**
   * Manage permissions
   */

  app.get('/acl/:role/:resource', (req, res, next) => {
    acl.allowedPermissions(req.params.role, req.resource, (err, result) => {
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
