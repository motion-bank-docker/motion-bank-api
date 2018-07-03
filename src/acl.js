const
  Acl = require('acl'),
  config = require('config'),
  Backend = Acl.mongodbBackend,
  { MongoDB } = require('mbjs-persistence')

const setupACL = async function (app) {
  const cfg = config.get('acl.mongodb')
  const client = new MongoDB(cfg, 'uuid')
  await client.connect()
  const acl = new Acl(new Backend(client.db, cfg.prefix))
  return acl
}

module.exports = setupACL
