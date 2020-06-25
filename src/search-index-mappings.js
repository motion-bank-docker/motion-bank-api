const searchIndexMappings = {
  annotations: {
    properties: {
      'target.selector._valueMillis': {
        type: 'date'
      },
      _created: {
        type: 'date'
      },
      _updated: {
        type: 'date'
      }
    }
  },
  maps: {
    properties: {
      _created: {
        type: 'date'
      },
      _updated: {
        type: 'date'
      }
    }
  }
}

module.exports = searchIndexMappings
