const User = require("../db/userSchema");
const bcrypt = require("bcrypt");
const Task = require("../db/taskSchema");
const { populate } = require("../db/userSchema");

module.exports.getAllUser = async (req, res, next) => {
  try {
    const { isPopulate = false, except = false } = req.query;
    const loggedUserId = req.userID;
    let query = {};
    let selectFields = "-password -emp_code";

    if (except) {
      query._id = { $ne: loggedUserId };
    }

    let usersQuery = User.find(query).select(selectFields).lean();

    if (isPopulate) {
      usersQuery = usersQuery.populate("tasks");
    }

    const users = await usersQuery.exec();

    return res.status(200).json(users);
  } catch (err) {
    next(err);
  }
};

module.exports.getUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId)
      .select("-password")
      .populate("tasks")
      .lean();
    user.password = undefined;
    return res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

module.exports.deleteUser = async (req, res, next) => {
  try {
    const { password } = req.body;
    const { userId } = req.params;
    const user = await User.findById(userId);
    const match = bcrypt.compare(password, user.password);
    if (match) {
      await User.findByIdAndDelete(userId);
      const task = await Task.findOneAndDelete({
        author: user._id,
      });
      task.assignTo.forEach(async (userId) => {
        const assignedUser = await User.findById(userId);
        assignedUser.tasks.remove(task._id);
        await assignedUser.save();
      });
    } else {
      return res
        .status(400)
        .json({ message: "Wrong password. Please try again." });
    }
  } catch (err) {
    next(err);
  }
};
