const Service = require('mbjs-generic-api/src/lib/service')
const Invite = require('./models/invite')

class Invites extends Service {
  constructor (api) {
    super('invites', api, Invite)
  }
}

module.exports = Invites
