const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    email: {
      type: String,
    },
    password: {
      type: String,
    },
    role: {
      type: String,
      enum: ["admin", "user"],
    },
    is_verified: {
      type: Boolean,
      default: false,
    },

    personal_info: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PersonalInfo",
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

const userModel = mongoose.model("User", userSchema);

module.exports = userModel;
