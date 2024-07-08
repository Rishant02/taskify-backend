require("dotenv").config();

const Task = require("./db/taskSchema");
const User = require("./db/userSchema");
const moment = require("moment");
const sendMail = require("./utils/sendMail");
const connectDB = require("./db/conn");
const cron = require("node-cron");

connectDB();

const createTaskMail = (task, toEmail, cc, creatorName) => {
  return {
    from: process.env.EMAIL_ADDRESS,
    to: toEmail.join(", "),
    subject: `${creatorName} assigned a task to you [${task.tname}]`,
    cc,
    template: "createTaskEmail",
    context: {
      tid: task.id,
      tname: task.tname,
      tdesc: task.tdesc,
      startDate: new Date(task.startDate).toLocaleDateString(),
      dueDate: new Date(task.dueDate).toLocaleDateString(),
      status: task.status,
    },
  };
};

async function createRecurTasks() {
  try {
    const tasks = await Task.find({
      recurAmount: { $ne: null },
      $expr: {
        $gte: [
          new Date(),
          {
            $add: [
              { $toDate: "$startDate" },
              { $multiply: ["$recurAmount", 24 * 60 * 60 * 1000] },
            ],
          },
        ],
      },
    });

    await Promise.all(
      tasks.map(async (task) => {
        const tnameRegex = /\[\d{1,2}\/\d{1,2}\/\d{4}\]/g;
        const newDateStr = `[${new Date().toLocaleDateString()}]`;
        const newTname = task.tname.replace(tnameRegex, newDateStr);
        const dueDateDiff = Math.ceil(
          (moment(task.dueDate) - moment(task.startDate)) /
            (24 * 60 * 60 * 1000)
        );

        const newTask = new Task({
          tname: newTname,
          tdesc: task?.tdesc,
          startDate: new Date().toISOString(),
          dueDate: moment().add(`${dueDateDiff}d`).endOf("day").toISOString(),
          assignTo: task.assignTo,
          author: task.author,
          recurAmount: task.recurAmount,
        });

        await Promise.all([
          ...newTask.assignTo.map((userId) =>
            User.findByIdAndUpdate(userId, { $push: { tasks: newTask._id } })
          ),
          User.findByIdAndUpdate(newTask.author, {
            $push: { tasks: newTask._id },
          }),
          newTask.save(),
          Task.findByIdAndUpdate(task._id, { recurAmount: null }),
        ]);

        const author = await User.findById(newTask.author._id);
        const toEmails = await Promise.all(
          newTask.assignTo.map(async (user) => {
            const assignee = await User.findById(user._id);
            if (assignee.email) {
              return assignee.email;
            }
          })
        );

        await sendMail(
          createTaskMail(
            newTask,
            toEmails.filter((email) => email),
            author.email,
            author.name
          )
        );
      })
    );
  } catch (error) {
    console.error(error);
  }
}

cron.schedule("0 0 * * *", async () => {
  try {
    await createRecurTasks();
  } catch (err) {
    console.log(err);
  }
});
