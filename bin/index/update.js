#!/usr/bin/env node

const
  config = require('config'),
  { ObjectUtil } = require('mbjs-utils'),
  { MongoDB } = require('mbjs-persistence'),
  SearchIndex = require('mbjs-generic-api/src/lib/search-index'),
  searchIndexMappings = require('../../src/search-index-mappings')

const main = async function () {
  const [node, cmd, index, force] = process.argv
  process.stdout.write(`${node} ${cmd}\n`)
  process.stdout.write(`Updating index ${index}...\n`)

  const searchIndex = new SearchIndex(index, searchIndexMappings[index])
  await searchIndex.ensure(!!force)

  let count = 0
  const client = new MongoDB(ObjectUtil.merge({name: index, logger: console}, config.get('resources.mongodb')), 'id')
  const results = await client.find({})
  for (const item of results) {
    await searchIndex.index(item.id, ObjectUtil.merge({}, item, {_id: undefined}))
    count++
    if (count % 100 === 0) process.stdout.write(`Items ${count}\n`)
  }

  process.stdout.write(`Items ${count}\n`)
  process.exit(0)
}

main()
