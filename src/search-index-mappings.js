const searchIndexMappings = {
  annotations: {
    properties: {
      id: {
        type: 'keyword'
      },
      type: {
        type: 'keyword'
      },
      'body.type': {
        type: 'keyword'
      },
      'body.source.id': {
        type: 'keyword'
      },
      'body.source.type': {
        type: 'keyword'
      },
      'target.id': {
        type: 'keyword'
      },
      'target.selector.id': {
        type: 'keyword'
      },
      'target.selector._valueMillis': {
        type: 'date'
      },
      'creator.id': {
        type: 'keyword'
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
      id: {
        type: 'keyword'
      },
      type: {
        type: 'keyword'
      },
      'creator.id': {
        type: 'keyword'
      },
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
