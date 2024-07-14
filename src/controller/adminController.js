const ErrorHandler = require("../utils/errorHandler");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { catchAsync } = require("../middleware/catchAsyncError");
const userBcrypt = require("../utils/userBcrypt");
const postModel = require("../model/postModel");
const userModel = require("../model/userModel");
exports.adminLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return next(new ErrorHandler(400, "Email Or Password Required"));
  }

  const user = await userModel.findOne({ email: email, role: "admin" });

  if (!user) {
    return next(new ErrorHandler(404, "admin Not Found"));
  }
  const match = await userBcrypt.comparePassword(password, user.password);
  if (!match) {
    return next(new ErrorHandler(400, "Password Is incorrect"));
  }

  const accessToken = jwt.sign(
    {
      userId: user?._id,
      role: user?.role,
      email: user?.email,
    },
    process.env.SECRET_KEY,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  // console.log(accessToken);

  const refreshToken = jwt.sign(
    { userId: user?._id },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    }
  );

  user.password = undefined;
  return res.status(200).json({
    success: true,
    message: "Admin Login Successful",
    data: {
      userData: user,
      accessToken: accessToken,
      refreshToken: refreshToken,
    },
  });
});

//update personal info
exports.updatePersonalInfo = catchAsync(async (req, res, next) => {
  const userId = req.headers.userId;
  const reqBody = req.body;
  //   console.log(reqBody)

  // Check if the user exists
  const user = await userModel.findById(userId);
  if (!user) {
    return next(new ErrorHandler(400, "You Are Not Authorized"));
  }

  const personalInfoId = user?.personal_info;

  // Find and update the personal information
  const updatedPersonalInfo = await personalInfoModel.findByIdAndUpdate(
    personalInfoId,
    reqBody,
    { new: true, runValidators: true }
  );

  if (!updatedPersonalInfo) {
    return next(new ErrorHandler(404, "Personal information not found"));
  }

  //Optionally, update user's personal_info reference
  // user.is_completed_personal_info = true;
  await user.save();

  return res.status(200).json({
    status: true,
    message: "Personal information updated successfully",
    data: updatedPersonalInfo,
  });
});

//get personal info
exports.getPersonalInfo = catchAsync(async (req, res, next) => {
  const userId = req.headers.userId;
  // console.log(userId)
  const user = await userModel.findById(userId).populate("personal_info");

  // Check if user exists
  if (!user) {
    return next(new ErrorHandler(404, "User not found"));
  }

  //  console.log(user)

  return res.status(200).json({ success: true, data: user });
});

exports.createPost = catchAsync(async (req, res, next) => {
  const reqBody = req.body;

  const post = await postModel.create(reqBody);

  if (!post) {
    return next(new ErrorHandler(400, "Something wrong with area creation"));
  }

  return res.status(200).json({
    status: true,
    message: "post created successfully",
    data: post,
  });
});

exports.deletePost = catchAsync(async (req, res, next) => {
  const postId = req.params.postId;

  const post = await postModel.findById(postId);

  if (!post) {
    return next(new ErrorHandler(400, "post not found"));
  }

  // console.log("parking area deleted", deletedParkingAreas);
  // Delete the area
  await postModel.findByIdAndDelete(postId);

  return res.status(200).json({
    status: true,
    message: "post deleted successfully",
    data: { post },
  });
});

exports.updatePost = catchAsync(async (req, res, next) => {
  const postId = req.params.postId;
  const reqBody = req.body;

  const post = await postModel.findByIdAndUpdate(postId, reqBody, {
    new: true,
  });

  if (!post) {
    return next(new ErrorHandler(400, "Something wrong with post updation"));
  }

  return res.status(200).json({
    status: true,
    message: "post updated successfully",
    data: post,
  });
});

// exports.getAllPost = catchAsync(async (req, res, next) => {
//   // const page = parseInt(req.query.page) || 1;
//   // const limit = parseInt(req.query.limit) || 10;
//   // const sortBy = req.query.sortBy || "createdAt";
//   // const sortOrder = req.query.sortOrder || "desc";
//   // const searchQuery = req.query.search;

//   // const skip = (page - 1) * limit;

//   const sortOptions = {};
//   sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

//   let areasQuery = postModel.find();
//   let areasCountQuery = postModel.countDocuments();

//   if (searchQuery) {
//     areasQuery = postModel.find({
//       name: { $regex: searchQuery, $options: "i" },
//     });
//     areasCountQuery = postModel.countDocuments({
//       name: { $regex: searchQuery, $options: "i" },
//     });
//   }

//   areasQuery = areasQuery.skip(skip).limit(limit).sort(sortOptions);

//   const [areas, totalAreas] = await Promise.all([areasQuery, areasCountQuery]);

//   return res.status(200).json({
//     status: true,
//     data: areas,
//     metadata: {
//       currentPage: page,
//       totalPages: Math.ceil(totalAreas / limit),
//       totalDocuments: totalAreas,
//     },
//   });
// });
exports.getAllPost = catchAsync(async (req, res, next) => {
  // Retrieve all posts without sorting, searching, and filtering
  const posts = await postModel.find().populate("user");

  // Count the total number of posts
  const totalPosts = await postModel.countDocuments();

  // Send the response with the data and metadata
  return res.status(200).json({
    status: true,
    data: posts,
    metadata: {
      totalDocuments: totalPosts,
    },
  });
});


exports.getSinglePost = catchAsync(async (req, res, next) => {
  const postId = req.params.postId;

  const post = await postModel.findById(postId);
  if (!post) {
    return next(new ErrorHandler(400, "post not found"));
  }

  return res.status(200).json({
    status: true,
    data: post,
  });
});

exports.allUsers = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const sortBy = req.query.sortBy || "createdAt";
  const sortOrder = req.query.sortOrder || "desc";
  const searchQuery = req.query.search;

  const skip = (page - 1) * limit;

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

  let usersQuery;
  let usersCountQuery;

  if (searchQuery) {
    const searchFilter = {
      $or: [
        { "personal_info.name": { $regex: searchQuery, $options: "i" } },
        { email: { $regex: searchQuery, $options: "i" } },
      ],
    };
    usersQuery = userModel
      .find(searchFilter)
      .populate("personal_info")
      .select("-password")
      .where("role")
      .equals("user");
    usersCountQuery = userModel.countDocuments({
      ...searchFilter,
      role: "user",
    });
  } else {
    usersQuery = userModel
      .find({ role: "user" })
      .populate("personal_info")
      .select("-password");
    usersCountQuery = userModel.countDocuments({ role: "user" });
  }

  usersQuery = usersQuery.skip(skip).limit(limit).sort(sortOptions);

  const [users, totalUsers] = await Promise.all([usersQuery, usersCountQuery]);

  return res.status(200).json({
    status: true,
    data: users,
    metadata: {
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit),
      totalDocuments: totalUsers,
    },
  });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  const userId = req.params.userId;

  const user = await userModel.findById(userId).populate("booking");
  if (!user) {
    return next(new ErrorHandler(400, "User not found"));
  }

  const bookingIdsToDelete = user.booking.map((booking) => booking._id);

  await bookingModel.deleteMany({ _id: { $in: bookingIdsToDelete } });

  await userModel.findByIdAndDelete(userId);

  return res.status(200).json({
    status: true,
    message: "User deleted successfully",
  });
});

exports.showAllAdmin = catchAsync(async (req, res, next) => {
  const admin = await userModel
    .find({ role: "admin" })
    .populate("personal_info");

  if (!admin) {
    return next(new ErrorHandler(400, "Admin not found"));
  }

  return res.status(200).json({
    status: true,
    data: admin,
  });
});

exports.inviteAsAdmin = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const user = await userModel.findOne({ email });

  if (!user) {
    return next(new ErrorHandler(400, "User not found"));
  }

  user.role = "admin";

  await user.save();

  return res.status(200).json({
    status: true,
    message: "User invited as admin successfully",
    data: user,
  });
});

exports.showAllBookingFromAdmin = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const sortBy = req.query.sortBy || "createdAt";
  const sortOrder = req.query.sortOrder || "desc";

  const skip = (page - 1) * limit;

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

  const filter = { is_paid: true };

  const [posts, totalPosts] = await Promise.all([
    postModel.find(filter).skip(skip).limit(limit).sort(sortOptions).populate('user'),
    postModel.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalPosts / limit);

  return res.status(200).json({
    status: true,
    currentPage: page,
    totalPages,
    totalDocuments: totalPosts,
    data: posts,
  });
});
