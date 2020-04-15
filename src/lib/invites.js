const Service = require('mbjs-generic-api/src/lib/service')
const Invite = require('./models/invite')

class Invites extends Service {
  constructor (api, groupsService) {
    super('invites', api, Invite)

    this._groupsService = groupsService
  }
}

module.exports = Invites
