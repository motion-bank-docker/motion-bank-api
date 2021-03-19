const getCredentials = require('./get-credentials')

const getHeaders = async function (context) {
  if (!context.credentials || context.credentials.expires_at < Date.now()) {
    context.credentials = await getCredentials(context.config)
  }
  return {
    Authorization: `${context.credentials.token_type} ${context.credentials.access_token}`
  }
}

module.exports = getHeaders
