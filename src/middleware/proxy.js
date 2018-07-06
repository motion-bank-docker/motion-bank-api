const
  axios = require('axios'),
  send = require('@polka/send-type')

module.exports = function (app) {
  app.use('/proxy', async (req, res, next) => {
    const result = await axios.get(req.query.url)
    send(res, 200, result.data, { 'Content-Type': result.headers['content-type'] })
  })
}
