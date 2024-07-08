const TaskUpdate = require("../db/taskUpdateSchema");
const Task = require("../db/taskSchema");
const ObjectId = require("mongoose").Types.ObjectId;
const Notification = require("../db/notificationSchema");
const sendMail = require("../utils/sendMail");
const User = require("../db/userSchema");

const taskUpdateEmail = (updatedBy, toEmail, cc, task, updateTask) => {
  return {
    from: process.env.EMAIL_ADDRESS,
    to: toEmail,
    cc,
    subject: `${updatedBy} updates the task [${task.tname}]`,
    template: "updateTaskEmail",
    context: {
      tid: task.id,
      tname: task.tname,
      authorName: task.author.name,
      updateReason: updateTask.updateReason,
      committedDate: new Date(updateTask.committedDate).toLocaleDateString(),
      dueDate: new Date(task.dueDate).toLocaleDateString(),
      updateStatus: updateTask.updateStatus,
    },
  };
};
module.exports.getTaskUpdate = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const taskUpdates = await TaskUpdate.find({
      taskId: taskId,
    })
      .populate("taskId")
      .populate("updatedBy", "-password")
      .sort({ _id: -1 });
    taskUpdates.forEach(async (tUpdate) => {
      const data = await Notification.findOneAndUpdate(
        { recipient: req.userID, taskUpdate: tUpdate._id },
        { read: true },
        { new: true }
      );
      if (data) {
        await Notification.findByIdAndDelete(data._id);
      }
    });
    return res.status(200).json(taskUpdates);
  } catch (err) {
    next(err);
  }
};

module.exports.createTaskUpdate = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { updateReason, committedDate, updateStatus } = req.body;
    const task = await Task.findById(taskId).populate("author", "-password");
    const updateAuthor = await User.findById(req.userID);
    const allUsersOfTask = task.assignTo.concat([task.author._id]);
    if (
      !(
        allUsersOfTask.some((userId) => userId.equals(updateAuthor._id)) ||
        (updateAuthor?.role === "department head" &&
          updateAuthor?.dept === task.author?.dept)
      )
    ) {
      return res
        .status(403)
        .json({ message: "You are not allowed to update status" });
    }
    const newUpdate = new TaskUpdate({
      taskId,
      updateReason,
      updatedBy: req.userID,
      committedDate,
      updateStatus,
    });
    newUpdate.attachment = req?.files?.map((f) => ({
      url: f.path,
      filename: f.filename,
    }));
    await Task.findByIdAndUpdate(
      taskId,
      { $push: { taskUpdates: newUpdate._id }, status: updateStatus },
      { new: true }
    ).populate("author");

    if (newUpdate.updatedBy.equals(task.author._id)) {
      let toEmails = await Promise.all(
        task.assignTo.map(async (user) => {
          const notifys = new Notification({
            recipient: user._id,
            taskUpdate: newUpdate._id,
          });
          await notifys.save();
          const userEmail = await User.findById(user._id).select({
            email: 1,
            _id: 0,
          });
          if (userEmail) {
            return userEmail;
          }
        })
      );
      await sendMail(
        taskUpdateEmail(
          updateAuthor?.name,
          toEmails.filter((email) => email),
          updateAuthor?.email,
          task,
          newUpdate
        )
      );
    } else if (
      !task.assignTo.includes(req.userID) &&
      updateAuthor?.role === "department head"
    ) {
      let toEmails = await Promise.all(
        task.assignTo.concat([task.author]).map(async (user) => {
          const notifys = new Notification({
            recipient: user._id,
            taskUpdate: newUpdate._id,
          });
          await notifys.save();
          const userEmail = await User.findById(user._id).select({
            email: 1,
            _id: 0,
          });
          if (userEmail) {
            return userEmail;
          }
        })
      );
      await sendMail(
        taskUpdateEmail(
          updateAuthor?.name,
          toEmails.filter((email) => email),
          updateAuthor?.email,
          task,
          newUpdate
        )
      );
    } else {
      let toEmails = await Promise.all(
        task.assignTo
          .filter((data) => !data._id.equals(req.userID))
          .concat([task.author])
          .map(async (user) => {
            const notifys = new Notification({
              recipient: user._id,
              taskUpdate: newUpdate._id,
            });
            await notifys.save();
            const userEmail = await User.findById(user._id).select({
              email: 1,
              _id: 0,
            });
            if (userEmail) {
              return userEmail;
            }
          })
      );
      await sendMail(
        taskUpdateEmail(
          updateAuthor?.name,
          toEmails.filter((email) => email),
          updateAuthor?.email,
          task,
          newUpdate
        )
      );
    }
    if (committedDate) {
      await Task.findByIdAndUpdate(taskId, { dueDate: committedDate });
    }
    await newUpdate.save();
    return res.status(201).json(newUpdate);
  } catch (err) {
    next(err);
  }
};
