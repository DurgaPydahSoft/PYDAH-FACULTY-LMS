const { Task } = require('../models');
const asyncHandler = require('express-async-handler');

// HR: Create a new task
exports.createTask = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title || !description) {
    return res.status(400).json({ msg: 'Title and description are required.' });
  }
  const task = new Task({
    title,
    description,
    createdBy: req.user.id
  });
  await task.save();
  res.status(201).json({ msg: 'Task created successfully.', task });
});

// HR: List all tasks
exports.listTasks = asyncHandler(async (req, res) => {
  const tasks = await Task.find().sort({ createdAt: -1 });
  res.json(tasks);
});

// Employee: List all tasks
exports.listTasksForEmployee = asyncHandler(async (req, res) => {
  const tasks = await Task.find().sort({ createdAt: -1 });
  res.json(tasks);
});
