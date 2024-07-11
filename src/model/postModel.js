const mongoose = require('mongoose')

const postSchema = mongoose.Schema(
  {
    name: String,
    city: {
      type: String,
    },
    area: {
      type: String,
    },
    address: {
      type: String,
    },
    images: [
      {
        type: String,
      },
    ],
    monthly_rent: {
      type: Number,
    },
    available_from: {
      type: Date,
      default: Date.now(),
    },
    is_paid: {
      type: Boolean,
      default: false,
    },
    contact_number: {
      type: String,
      required: true,
    },
    advanced_pay: {
      type: Number,
      default: 0,
      required: true,
    },
    bed_room: {
      type: Number,
      default: 0,
      required: true,
    },
    bath_room: {
      type: Number,
      default: 0,
      required: true,
    },
    description: {
      type: String,
    },
    drawing_dinng: {
      type: Boolean,
      default: false,
    },
    with_furniture: {
      type: Boolean,
      default: false,
    },
    map_link: String,
  },

  {
    versionKey: false,
    timestamps: true,
  }
)

const postModel = mongoose.model('Post', postSchema)

module.exports = postModel
