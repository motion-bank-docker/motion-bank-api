const Service = require('mbjs-generic-api/src/lib/service')
const Group = require('./models/group')
const send = require('@polka/send-type')

class Groups extends Service {
  constructor (api) {
    super('groups', api, Group)

    api.app.get('/users/memberships', (req, res) => this.membershipHandler(req, res))
    api.app.delete('/users/memberships/:uuid',
      (req, res) => this.membershipDeleteHandler(req, res))
  }

  async membershipHandler (req, res) {
    const query = {
      $or: [
        { members: req.user.id },
        { 'creator.id': req.user.id }
      ]
    }
    const results = await this._client.find(query)
    send(res, 200, {
      items: results.map(item => ({
        title: item.title,
        id: item.id,
        uuid: item.uuid,
        creator: item.creator
      }))
    })
  }

  async membershipDeleteHandler (req, res) {
    const group = await this.client.get(this.getResourceId(req.params.uuid))
    if (group && Array.isArray(group.members)) {
      const index = group.members.findIndex(entry => entry === req.user.id)
      group.members.splice(index, 1)
      await this.client.patch(group.id, { $set: { members: group.members } })
      send(res, 200)
    }
    else send(res, 404)
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
