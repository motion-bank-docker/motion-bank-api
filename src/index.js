const
  config = require('config'),
  GenericAPI = require('mbjs-generic-api'),
  { version } = require('../package.json'),
  { parseURI } = require('mbjs-data-models/src/lib'),
  getTokenFromHeaders = require('mbjs-generic-api/src/util/get-token-from-headers'),
  searchIndexMappings = require('./search-index-mappings')

const setup = async function () {
  const services = []
  const api = new GenericAPI()
  await api.setup(version)

  /**
   * Configure Profiles
   */
  const
    Profiles = require('./lib/profiles'),
    profiles = new Profiles(api)
  // profiles.on('message', message => api._logger.debug(message))
  services.push(profiles)

  const addCreator = require('mbjs-generic-api/src/middleware/creator')
  addCreator(api, config)

  /**
   * Configure resources
   */
  const
    models = require('mbjs-data-models'),
    Service = require('mbjs-generic-api/src/lib/service')

  const cells = new Service('cells', api, models.Cell)
  // cells.on('message', message => api._sockets.write(message))
  services.push(cells)

  const annotations = new Service('annotations', api, models.Annotation, {
    async delete (req, res, payload) {
      if (!payload) return

      if (payload.body.type.indexOf('cell.jsonld') > -1) {
        try {
          await cells.deleteHandler({
            params: { uuid: parseURI(payload.body.source.id).uuid },
            headers: req.headers
          })
        }
        catch (err) {
          api.captureException(err)
        }
      }
      else {
        try {
          const results = await annotations.findHandler({
            query: { query: JSON.stringify({ 'target.id': payload.id }) },
            headers: req.headers
          })
          if (results.data && Array.isArray(results.data.items)) {
            for (const annotation of results.data.items) {
              await annotations.deleteHandler({
                params: { uuid: parseURI(annotation.id).uuid },
                headers: req.headers
              })
            }
          }
        }
        catch (err) {
          api.captureException(err)
        }
      }
    }
  }, searchIndexMappings.annotations)
  // annotations.on('message', message => api._sockets.write(message))
  services.push(annotations)

  const maps = new Service('maps', api, models.Map, {
    async delete (req, res, payload) {
      if (!payload) return

      const results = await annotations.findHandler({
        query: { query: JSON.stringify({ 'target.id': payload.id }) },
        headers: req.headers
      })
      if (results.data && Array.isArray(results.data.items)) {
        for (const annotation of results.data.items) {
          try {
            await annotations.deleteHandler({
              params: { uuid: parseURI(annotation.id).uuid },
              headers: req.headers
            })
          }
          catch (err) {
            api.captureException(err)
          }
        }
      }
    }
  }, searchIndexMappings.maps)
  // maps.on('message', message => api._sockets.write(message))
  services.push(maps)

  /**
   * Configure Assets
   */
  if (config.assets && config.assets.host) {
    const
      Assets = require('./lib/assets'),
      assets = new Assets(api, config)
    services.push(assets)
  }

  const components = new Service('components', api, models.Component)
  // components.on('message', message => api._sockets.write(message))
  services.push(components)

  const Manage = require('./lib/manage')
  const manage = new Manage(api)
  services.push(manage)

  api.addHook('acl', 'allow', async function (api, req) {
    if (typeof req.query.resource === 'string' && req.query.resource.indexOf('/maps/') > -1) {
      const results = await annotations.findHandler({
        query: { query: JSON.stringify({ 'target.id': req.query.resource }) },
        headers: req.headers
      })
      if (results.data && Array.isArray(results.data.items)) {
        for (const annotation of results.data.items) {
          if (annotation.body.type.indexOf('cell.jsonld') > -1) {
            try {
              await api.acl.send({
                source: req.query.resource,
                target: annotation.body.source.id,
                token: getTokenFromHeaders(req.headers),
                type: 'acl:clonePermissions'
              })
            }
            catch (err) {
              api.captureException(err)
            }
          }
          else {
            try {
              const results = await annotations.findHandler({
                query: { query: JSON.stringify({ 'target.id': annotation.id }) },
                headers: req.headers
              })
              if (results.data && Array.isArray(results.data.items)) {
                for (const annotation of results.data.items) {
                  await api.acl.send({
                    source: req.query.resource,
                    target: annotation.id,
                    token: getTokenFromHeaders(req.headers),
                    type: 'acl:clonePermissions'
                  })
                }
              }
            }
            catch (err) {
              api.captureException(err)
            }
          }
          try {
            await api.acl.send({
              source: req.query.resource,
              target: annotation.id,
              token: getTokenFromHeaders(req.headers),
              type: 'acl:clonePermissions'
            })
          }
          catch (err) {
            api.captureException(err)
          }
        }
      }
    }
  })

  /** Configure search */
  const
    Search = require('mbjs-generic-api/src/lib/search'),
    search = new Search(api)
  services.push(search)

  /**
   * Configure sessions
   */

  const
    Sessions = require('./lib/sessions'),
    sessions = new Sessions(api, maps, annotations)
  // sessions.on('message', message => api._logger.write(message))
  services.push(sessions)

  /**
   * Configure archives
   */

  const archives = require('./lib/archives')
  archives.setupArchives(api, maps, annotations, cells)
  services.push(archives)

  /**
   * Configure groups & invitations
   */

  const Groups = require('./lib/groups'),
    groups = new Groups(api)
  services.push(groups)

  const Invites = require('./lib/invites'),
    invites = new Invites(api, groups)
  services.push(invites)

  process.stdout.write(`Initialised ${services.length} services\n`)

  await api.start()
}

setup().catch(err => {
  process.stderr.write(err.message + '\n')
  process.stderr.write(err.stack + '\n')
  process.exit(err.code)
})
