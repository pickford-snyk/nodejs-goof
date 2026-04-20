
var express = require('express')
var typeorm = require("typeorm");

var router = express.Router()
module.exports = router

router.get('/', async (req, res, next) => {

  const mongoConnection = typeorm.getConnection('mysql')
  const repo = mongoConnection.getRepository("Users")

  // hard-coded getting account id of 1
  // as a rpelacement to getting this from the session and such
  // (just imagine that we implemented auth, etc)
  const results = await repo.find({ id: 1 })

  // Log Object's where property for debug reasons:
  console.log('The Object.where property is set to: ', {}.where)
  console.log(results)

  return res.json(results)

})

// Get user summary by ID
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (Number.isNaN(id) || id < 1) {
      return res.status(400).json({ error: 'Invalid user ID' })
    }

    const connection = typeorm.getConnection('mysql')
    const repo = connection.getRepository("Users")
    const results = await repo.find({ id })
    const user = results[0]

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    return res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role
    })
  } catch (err) {
    console.error(err)
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const mongoConnection = typeorm.getConnection('mysql')
    const repo = mongoConnection.getRepository("Users")

    const user = {}
    user.name = req.body.name
    user.username = req.body.username
    user.address = req.body.address
    user.role = req.body.role

    const savedRecord = await repo.save(user)
    console.log("Post has been saved: ", savedRecord)
    return res.sendStatus(200)

  } catch (err) {
    console.error(err)
    console.log({}.where)
    next();
  }
})