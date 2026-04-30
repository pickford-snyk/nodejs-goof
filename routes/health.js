var express = require('express');

var router = express.Router();

module.exports = router;

/**
 * GET /api/health
 * Liveness probe: JSON status and process uptime (seconds).
 */
router.get('/', function (req, res) {
  return res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime())
  });
});
