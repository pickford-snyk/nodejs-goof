var express = require('express');
var router = express.Router();

// Sequelize 6.9 components (DB setup to be added later; DataTypes for model definition)
var { Op } = require('sequelize');

// In-memory placeholder until DB is set up
var descriptionsByUserId = new Map([
  [1, 'User from Israel, standard role.'],
  [2, 'Admin user from UK.']
]);

/**
 * GET /user-descriptions
 * Returns all user descriptions. Uses Sequelize Op for query-style constants.
 */
router.get('/', function (req, res, next) {
  var list = [];
  descriptionsByUserId.forEach(function (description, userId) {
    list.push({
      userId: userId,
      description: description
    });
  });
  res.json({ descriptions: list });
});

/**
 * GET /user-descriptions/:userId
 * Returns one user's description by ID.
 * Uses Sequelize Op for valid ID range (same shape as a future Model.findAll where clause).
 */
router.get('/:userId', function (req, res, next) {
  var userId = parseInt(req.params.userId, 10);
  var validIdWhere = { [Op.gte]: 1, [Op.lte]: 2147483647 };
  var isValid = !Number.isNaN(userId) && userId >= validIdWhere[Op.gte] && userId <= validIdWhere[Op.lte];
  if (!isValid) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }
  var description = descriptionsByUserId.get(userId);
  if (!description) {
    return res.status(404).json({ error: 'User description not found' });
  }
  res.json({ userId: userId, description: description });
});

module.exports = router;
