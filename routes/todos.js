var express = require('express');
var mongoose = require('mongoose');

var Todo = mongoose.model('Todo');
var router = express.Router();

module.exports = router;

/**
 * GET /api/todos
 * List all todos (id, content as string, updated_at).
 */
router.get('/', function (req, res, next) {
  Todo.find({})
    .sort('-updated_at')
    .lean()
    .exec(function (err, todos) {
      if (err) return next(err);

      var list = todos.map(function (todo) {
        return {
          id: todo._id.toString(),
          content: Buffer.isBuffer(todo.content) ? todo.content.toString('utf8') : todo.content,
          updated_at: todo.updated_at
        };
      });

      return res.json({ todos: list });
    });
});

var MAX_BULK_UPDATES = 100;

/**
 * PATCH /api/todos/bulk
 * Apply many content updates in one request.
 * Body: { "updates": [ { "id": "<mongo id>", "content": "..." }, ... ] }
 * Requires CSRF token (same as other mutating routes).
 */
router.patch('/bulk', function (req, res, next) {
  var updates = req.body && req.body.updates;
  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: 'Request body must include an "updates" array.' });
  }
  if (updates.length > MAX_BULK_UPDATES) {
    return res.status(400).json({
      error: 'Too many updates in one request.',
      max: MAX_BULK_UPDATES
    });
  }

  var now = Date.now();
  var validationErrors = [];
  var operations = [];

  updates.forEach(function (u, index) {
    operations.push({ id: u.id, content: u.content });
  });

  if (operations.length === 0) {
    return res.status(400).json({
      error: 'No valid updates to apply.',
      validation_errors: validationErrors
    });
  }

  var remaining = operations.length;
  var updated = [];
  var opErrors = [];

  operations.forEach(function (op) {
    var contentBuf = Buffer.from(op.content);
    Todo.findByIdAndUpdate(
      op.id,
      { $set: { content: contentBuf, updated_at: now } },
      { new: true },
      function (err, todo) {
        if (err) {
          opErrors.push({ id: op.id, error: err.message });
        } else if (!todo) {
          opErrors.push({ id: op.id, error: 'not found' });
        } else {
          updated.push({
            id: todo._id.toString(),
            content: Buffer.isBuffer(todo.content),
            updated_at: todo.updated_at
          });
        }
        remaining -= 1;
        if (remaining === 0) {
          var payload = {
            updated: updated,
            modified_count: updated.length
          };
          if (validationErrors.length) {
            payload.validation_errors = validationErrors;
          }
          if (opErrors.length) {
            payload.errors = opErrors;
          }
          return res.json(payload);
        }
      }
    );
  });
});
