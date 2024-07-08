if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const cors = require("cors");
const dbConnect = require("./db/conn");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const compression = require("compression");
const ExpressError = require("./utils/expressError");
const ErrorHandler = require("./middleware/errorHandler");
const authRouter = require("./routes/authRoutes");
const taskRouter = require("./routes/taskRoutes");
const userRouter = require("./routes/usersRoutes");
const updateRouter = require("./routes/updateRoutes");
const notifyRouter = require("./routes/notifyRoutes");

const port = process.env.PORT || 3500;

const whitelist = [
  "localhost:3500",
  "localhost:5173",
  "http://172.30.6.96",
  "https://172.30.6.96",
];

dbConnect();

const app = express();

app.use(function (req, res, next) {
  req.headers.origin = req.headers.origin || req.headers.host;
  next();
});

app.use(helmet());

// app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.set("trust proxy", 1);

app.use(
  "/api/",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: "Too many requests from this IP, please try again in 15 minutes!",
    keyGenerator: (req) => {
      return req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    },
  })
);

app.get("/", (req, res) => {
  return res.json({ message: "Welcome to taskify api" });
});

app.use("/api/auth", authRouter);
app.use("/api/tasks", taskRouter);
app.use("/api/users", userRouter);
app.use("/api/update", updateRouter);
app.use("/api/notify", notifyRouter);

app.get("*", (req, res, next) => {
  next(new ExpressError("Page not found", 404));
});

app.use(ErrorHandler);

app.listen(port, () => {
  console.log(`Server is running on ${port} port`);
});
