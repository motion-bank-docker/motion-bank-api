const { ObjectUtil } = require('mbjs-utils')

const setup = async function (api, profileService) {
  api.app.use(async (req, res, next) => {
    if (req.user) {
      const r = {
        params: {
          id: req.user.uuid
        },
        user: req.user
      }
      const result = await profileService.getHandler(r)
      req.user.profile = ObjectUtil.merge({}, req.user.profile, result.data)
      if (req.method.toLowerCase() === 'post') {
        req.body.author = {
          id: req.user.uuid,
          name: req.user.profile ? req.user.profile.name : undefined
        }
      }
    }
    next()
  })
}

module.exports = setup
