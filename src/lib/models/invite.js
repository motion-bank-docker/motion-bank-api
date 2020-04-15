const SchemaObject = require('schema-object')
const shortid = require('shortid')
const { Person } = require('mbjs-data-models/src/models/internal')
const { uuid } = require('mbjs-utils')
const config = require('config')

const Invite = new SchemaObject({
  id: { type: String },
  uuid: { type: String },
  group_id: { type: String },
  code: { type: String },
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
      if (typeof this.id !== 'string') {
        this.id = `${config.api.uriPrefix}invites/${this.uuid}`
      }
      if (typeof this.code !== 'string') {
        this.code = shortid.generate()
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

module.exports = Invite
