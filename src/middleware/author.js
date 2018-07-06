const
  config = require('config'),
  axios = require('axios')

const setup = async function (app) {
  app.use(async (req, res, next) => {
    if (req.method.toLowerCase() === 'post') {
      if (req.body) {
        const profile = await axios.get(`${config.auth.jwt.issuer}userinfo`, {
          headers: {
            Authorization: req.headers.authorization
          }
        })
        req.body.author = {
          id: req.user.uuid,
          name: profile.data.name
        }
      }
    }
    next()
  })
}

module.exports = setup
