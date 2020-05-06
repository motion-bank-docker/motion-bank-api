const SchemaObject = require('schema-object')
const { Person } = require('mbjs-data-models/src/models/internal')
const { uuid } = require('mbjs-utils')
const config = require('config')

const Group = new SchemaObject({
  id: { type: String },
  uuid: { type: String },
  title: { type: String, required: true },
  creator: {
    type: Person
  },
  members: Array,
  created: Number,
  updated: Number
}, {
  strict: true,
  constructors: {
    default (data) {
      this.populate(data)

      if (typeof this.uuid !== 'string') {
        this.uuid = uuid.v4()
      }
      if (typeof this.id !== 'string') {
        this.id = `${config.api.uriPrefix}groups/${this.uuid}`
      }
      if (typeof this.created !== 'number') {
        this.created = Date.now()
      }
    }
  },
  methods: {
    touch () {
      this.updated = Date.now()
    }
  }
})

module.exports = Group
