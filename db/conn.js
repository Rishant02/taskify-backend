const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const { connection } = await mongoose.connect(process.env.MONGO_URI_DEV);
    console.log(`MongoDB Connected: ${connection.host} - ${connection.name}`);
  } catch (err) {
    console.log(`Error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
