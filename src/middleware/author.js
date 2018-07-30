const setup = async function (app, profileService) {
  app.use(async (req, res, next) => {
    const r = {
      params: {
        id: req.user.uuid
      },
      user: req.user
    }
    req.user.profile = await profileService.getHandler(r)
    if (req.method.toLowerCase() === 'post') {
      req.body.author = {
        id: req.user.uuid,
        name: req.user.profile ? req.user.profile.name : undefined
      }
    }
    next()
  })
}

module.exports = setup
