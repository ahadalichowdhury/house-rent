const mongoose = require('mongoose')

const personalInfoSchema = mongoose.Schema(
  {
    name: String,
    address: String,
    date_of_birth: String,
    profile_image: String,
    phone_number: String,
  },
  {
    versionKey: false,
    timestamps: true,
  }
)

const personalInfoModel = mongoose.model('PersonalInfo', personalInfoSchema)

module.exports = personalInfoModel
