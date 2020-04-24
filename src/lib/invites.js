const Service = require('mbjs-generic-api/src/lib/service')
const Invite = require('./models/invite')
const send = require('@polka/send-type')

class Invites extends Service {
  constructor (api, groupsService) {
    super('invites', api, Invite)

    const _this = this
    this._groupsService = groupsService

    api.app.get('/invites/:code/:action', async (req, res) => {
      let results
      try {
        results = await this.client.find({ code: req.params.code })
      }
      catch (err) {
        api.captureException(err)
        return _this._errorResponse(res, 500)
      }
      if (results.length) {
        const invite = results.shift()
        if (req.params.action === 'reject') {
          await this.client.remove(invite.id)
          return send(res, 200)
        }
        else if (req.params.action === 'accept') {
          const group = await _this._groupsService.client.get(invite.group_id)
          if (!Array.isArray(group.members)) {
            group.members = [req.user.id]
          }
          else if (group.members.indexOf(req.user.id) === -1) {
            group.members.push(req.user.id)
          }
          await _this._groupsService.client.patch(invite.group_id, { $set: { members: group.members } })
          await this.client.remove(invite.id)
          return send(res, 200)
        }
        else return send(res, 400)
      }
      send(res, 404)
    })
  }

  async findHandler (req, res) {
    if (!req.query.query) return send(res, 400)
    const query = JSON.parse(req.query.query)
    if (!query || !Object.keys(query).length) return send(res, 400)
    const results = await this._client.find(query)
    send(res, 200, { items: results })
  }
}

module.exports = Invites
