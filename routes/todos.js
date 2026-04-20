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
