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

// HR: Update a task
exports.updateTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;
  const task = await Task.findById(id);
  if (!task) {
    return res.status(404).json({ msg: 'Task not found.' });
  }
  if (title) task.title = title;
  if (description) task.description = description;
  await task.save();
  res.json({ msg: 'Task updated successfully.', task });
});

// HR: Delete a task
exports.deleteTask = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const task = await Task.findById(id);
  if (!task) {
    return res.status(404).json({ msg: 'Task not found.' });
  }
  await task.deleteOne();
  res.json({ msg: 'Task deleted successfully.' });
});