const GenericAPI = require('mbjs-generic-api')

const run = async function () {
  const api = new GenericAPI()
  await api.setup()

  /**
   * Configure resources
   */
  const
    models = require('mbjs-data-models'),
    Service = require('../src/lib/service')

  const maps = new Service('maps', api, models.Map)
  const results = await maps._client.find({})
  for (let map of results) {
    if (map.title && map.title.match(/griddle/i)) {
      console.log(map.title)
      await new Promise((resolve, reject) => {
        api._acl.removeAllow('public', map.uuid, ['get'], err => {
          if (err) return reject(err)
          resolve()
        })
      })
      await new Promise((resolve, reject) => {
        api._acl.allow('digitanz', map.uuid, ['get'], err => {
          if (err) return reject(err)
          resolve()
        })
      })
    }
  }
}

run().then(() => process.exit(0))
