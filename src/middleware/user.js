const { ObjectUtil } = require('mbjs-utils')

const setup = async function (app) {
  app.use(async (req, res, next) => {
    if (req.user) {
      req.user.uuid = ObjectUtil.uuid5(req.user.sub)
    }
    next()
  })
}

module.exports = setup
