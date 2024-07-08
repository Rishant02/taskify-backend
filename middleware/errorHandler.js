const ErrorHandler = (err, req, res, next) => {
  const errStatus = err.statusCode || 500;
  const errMessage = err.message || "Internal Server Error";
  let errors, fields, code;

  // Mongoose Validation Error
  if (err.name === "ValidationError") {
    errors = Object.values(err.errors).map((el) => el.message);
    fields = Object.values(err.errors).map((el) => el.path);
    code = 400;

    const formattedErrors = errors.join(", ");
    return res.status(code).json({
      success: false,
      message: formattedErrors,
      fields,
      stack: process.env.NODE_ENV === "development" ? err.stack : {},
    });
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000 && err.keyPattern) {
    fields = Object.keys(err.keyPattern);
    code = 409;
    return res.status(code).json({
      success: false,
      message: `A member with that ${fields.join(", ")} already exists`,
      fields,
      stack: process.env.NODE_ENV === "development" ? err.stack : {},
    });
  }

  // Mongoose Cast Error
  if (err.name === "CastError") {
    code = 400;
    return res.status(code).json({
      success: false,
      message: `Invalid ${err.path}`,
      stack: process.env.NODE_ENV === "development" ? err.stack : {},
    });
  }

  // Other Mongoose Errors
  if (err.name === "VersionError" || err.name === "OverwriteModelError") {
    code = 409;
    return res.status(code).json({
      success: false,
      message: "Document has been modified. Please try again.",
      stack: process.env.NODE_ENV === "development" ? err.stack : {},
    });
  }

  // Express Errors
  return res.status(errStatus).json({
    success: false,
    status: errStatus,
    message: errMessage,
    stack: process.env.NODE_ENV === "development" ? err.stack : {},
  });
};

module.exports = ErrorHandler;
