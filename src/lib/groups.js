const Service = require('mbjs-generic-api/src/lib/service')
const Group = require('./models/group')
const send = require('@polka/send-type')

class Groups extends Service {
  constructor (api) {
    super('groups', api, Group)
  }

  async getHandler (req, res) {
    const result = await super.getHandler(req)
    if (result.error && req.user && result.code === 403) {
      const group = await this.client.get(this.getResourceId(req.params.uuid))
      if (group) {
        send(res, 200, { title: group.title, id: group.id, uuid: group.uuid })
      }
      else send(res, 404)
    }
    else if (result.error && result.code) send(res, result.code)
    else send(res, 200, result.data)
  }
}

module.exports = Groups
