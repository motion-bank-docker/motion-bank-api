const Service = require('mbjs-generic-api/src/lib/service')
const Group = require('./models/group')

class Groups extends Service {
  constructor (api) {
    super('groups', api, Group)
  }
}

module.exports = Groups
