const
  { MongoDB } = require('mbjs-persistence'),
  { ObjectUtil, uuid } = require('mbjs-utils'),
  config = require('config'),
  { Annotation, Map } = require('mbjs-data-models/src/models')

const
  timelinePrefix = 'https://app.motionbank.org/piecemaker/timelines/',
  gridPrefix = 'https://app.motionbank.org/mosys/grids/'

const newPrefix = 'http://id.motionbank.org/'

const proc = async function () {
  console.log('MAPS\n--------------------------\n\n')
  const mapsClient = new MongoDB(
    ObjectUtil.merge({ name: 'maps', logger: console },
      config.get('resources.mongodb')),
    'uuid'
  )
  await mapsClient.connect()
  const maps = await mapsClient.find({})
  for (let map of maps) {
    if (typeof map.author === 'string') {
      map.author = { id: map.author }
      console.log('updating author to', map.author)
    }
    const mi = new Map(map)
    await mapsClient.update(map.uuid, mi)
  }

  console.log('ANNOTATIONS\n-------------------\n\n')
  const annoClient = new MongoDB(
    ObjectUtil.merge({ name: 'annotations', logger: console },
      config.get('resources.mongodb')),
    'uuid'
  )
  await annoClient.connect()
  const annos = await annoClient.find({})
  for (let anno of annos) {
    if (typeof anno.author === 'string') {
      anno.author = { id: anno.author }
      console.log('updating author to', anno.author)
    }
    if (typeof anno.target.id === 'string' && anno.target.id.indexOf(timelinePrefix) === 0) {
      anno.target.id = anno.target.id.replace(timelinePrefix, `${newPrefix}maps/`)
      console.log('updating timeline target to', anno.target.id)
    }
    if (typeof anno.target.id === 'string' && anno.target.id.indexOf(gridPrefix) === 0) {
      anno.target.id = anno.target.id.replace(gridPrefix, `${newPrefix}maps/`)
      console.log('updating grid target to', anno.target.id)
    }
    if (anno.target.type === 'Timeline' && typeof anno.target.id === 'string' && uuid.isUUID(anno.target.id)) {
      anno.target.id = `${newPrefix}maps/${anno.target.id}`
      console.log('updating timeline target to', anno.target.id)
    }
    if (anno.target.type === '2DGrid' && typeof anno.target.id === 'string' && uuid.isUUID(anno.target.id)) {
      anno.target.id = `${newPrefix}maps/${anno.target.id}`
      console.log('updating grid target to', anno.target.id)
    }
    const ai = new Annotation(anno)
    await mapsClient.update(anno.uuid, ai)
  }
}

proc().then(() => process.exit(0))
