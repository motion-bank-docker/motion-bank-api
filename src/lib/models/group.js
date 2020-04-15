const SchemaObject = require('schema-object')
const { Person } = require('mbjs-data-models/src/models/internal')
const { uuid } = require('mbjs-utils')

const Group = new SchemaObject({
  uuid: { type: String },
  title: { type: String, required: true },
  creator: {
    type: Person
  },
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
