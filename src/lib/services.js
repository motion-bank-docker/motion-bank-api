const cote = require('cote')

class Services {
  constructor (api) {
    this._io = require('socket.io').listen(api._server)
    this._io.on('connection', socket => {
      socket.join('default')
    })

    this._sockend = new cote.Sockend(this._io, {
      name: 'Default Sockend'
      // key: 'default'
    })
  }
}

module.exports = Services
