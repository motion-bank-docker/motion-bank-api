const
  { ObjectUtil } = require('mbjs-utils'),
  axios = require('axios')

const getCredentials = async function (config) {
  const result = await axios.post(
    config.tokenEndpoint,
    {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      audience: config.audience,
      grant_type: 'client_credentials'
    },
    {
      headers: { 'content-type': 'application/json' }
    }
  )
  return ObjectUtil.merge({
    expires_at: Date.now() + result.data.expires_in * 1000
  }, result.data)
}

module.exports = getCredentials
