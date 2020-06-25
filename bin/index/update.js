#!/usr/bin/env node

const
  config = require('config'),
  SearchIndex = require('mbjs-generic-api/src/lib/search-index')

const main = async function () {
  const [node, cmd, index] = process.argv
  process.stdout.write(`${node} ${cmd}\n`)
  process.stdout.write(`Updating index ${index}...\n`)

  // const index = new SearchIndex(index)
}

main()
