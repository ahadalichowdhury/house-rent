const userModel = require("../model/userModel")
const { catchAsync } = require("../middleware/catchAsyncError");
const personalInfoModel = require("../model/personalInfoModel");
const ErrorHandler = require("../utils/errorHandler");
const userBcrypt = require("../utils/userBcrypt");
const SendEmailUtils = require("../utils/SendEmailUtils");
const otpGenerator = require("otp-generator");
const OTPModel = require("../model/OTPModel");
// const fcmModel = require("../model/fcmModel");
const jwt = require("jsonwebtoken");
const verifyRefreshToken = require("../utils/verifyRefreshToken");
const areaModel = require("../model/postModel");
const postModel = require("../model/postModel");
const regex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@.#$!%*?&])[A-Za-z\d@.#$!%*?&]{8,15}$/;

exports.userRegistration = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;

  //validation checks
  if (!name || !email || !password) {
    return next(new ErrorHandler(400, "All Fields Are Required"));
  }
  //password regex check
  if (!regex.test(password)) {
    return next(
      new ErrorHandler(
        400,
        "Invalid password format. Password must have at least one lowercase letter, one uppercase letter, one digit, one special character, and be 8-15 characters long."
      )
    );
  }
  //check user in db
  const user = await userModel.findOne({ email: email });

  //if user exist
  if (user) {
    return next(new ErrorHandler(400, "User Already Exists"));
  }

  //hashed the password
  const hashedPassword = await userBcrypt.hashPassword(password);

  //create personal info
  const personalInfo = await personalInfoModel.create({
    name: name,
  });

  //catch the new created personalinfo id
  const personalInfoId = personalInfo;

  //create new user
  const newUser = await userModel.create({
    email: email,
    password: hashedPassword,
    role: "user",
    personal_info: personalInfoId,
  });

  //4 digit otp generate
  const OTPCode = otpGenerator.generate(4, {
    digits: true,
    alphabets: false,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

  const userCount = await userModel.aggregate([
    { $match: { email: email } },
    { $count: "total" },
  ]);

  if (userCount.length > 0) {
    // Insert OTP into the database
    await OTPModel.create({ email: email, otp: OTPCode });

    // Send email with OTP
    const emailMessage = `Your Verification Pin Code is: ${OTPCode}`;
    const emailSubject = "NetWorth";
    const emailSend = await SendEmailUtils(email, emailMessage, emailSubject);

    newUser.password = undefined;

    return res.status(201).json({
      status: true,
      message: "Check Your Mail For Verification OTP",
      data: newUser,
    });
  } else {
    return next(new ErrorHandler(400, "User not Found"));
  }
});

exports.verifyRegistrationOTP = catchAsync(async (req, res, next) => {
  const { email, otp } = req.body;
  const user = await userModel.findOne({ email });

  if (!user) {
    return next(new ErrorHandler(404, "User not found"));
  }

  // Check if OTP exists and is not expired
  const OTPStatus = 0; // Status 0 indicates the OTP is not yet verified
  const OTPCount = await OTPModel.countDocuments({
    email,
    otp,
    status: OTPStatus,
  });

  if (OTPCount === 0) {
    return next(new ErrorHandler(400, "Invalid OTP"));
  }

  // Update OTP status to indicate verification
  await OTPModel.updateOne({ email, otp, status: OTPStatus }, { status: 1 });

  user.is_verified = true;
  user.save();

  return res.status(200).json({
    status: true,
    message: "OTP Verified Successfully",
  });
});

//user login
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await userModel.findOne({ email }).select("+password");

  if (!user) {
    return next(new ErrorHandler(400, "User Not Exists"));
  }

  const match = await userBcrypt.comparePassword(password, user.password);
  if (!match) {
    return next(new ErrorHandler(400, "Password Is incorrect"));
  }

  // console.log(match)
  
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
  res.status(200).json({
    status: true,
    message: "login successful",
    data: user,
    accessToken: accessToken,
    refreshToken: refreshToken,
  });
});


exports.generateAccessToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;

  // Verify the refresh token and get userId
  const verificationResult = await verifyRefreshToken.verifyRefresh(
    refreshToken
  );
  // console.log(verificationResult);

  if (!verificationResult.valid) {
    return next(new ErrorHandler(401, "Invalid token, try logging in again"));
  }

  const { userId } = verificationResult;
  // console.log("User ID:", userId);

  // Find the user based on userId
  const user = await userModel.findById(userId);
  // console.log("User:", user);

  if (!user) {
    return next(new ErrorHandler(400, "User not found"));
  }

  // Generate a new access token
  const accessToken = jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role,
    },
    process.env.SECRET_KEY,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  return res.status(200).json({ success: true, accessToken });
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

  return res
    .status(200)
    .json({ success: true, data: user});
});

//forget password related controller
exports.RecoverVerifyEmail = catchAsync(async (req, res) => {
  const email = req.params.email;

  // OTP code generation
  const OTPCode = otpGenerator.generate(4, {
    digits: true,
    alphabets: false,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

  // Check if the user exists
  const userCount = await userModel.aggregate([
    { $match: { email: email } },
    { $count: "total" },
  ]);

  if (userCount.length > 0) {
    // Insert OTP into the database
    await OTPModel.create({ email: email, otp: OTPCode });

    // Send email with OTP
    const emailMessage = `Your Pin Code is: ${OTPCode}`;
    const emailSubject = "RFQ Verification System";
    const emailSend = await SendEmailUtils(email, emailMessage, emailSubject);

    res.status(200).json({ status: true, data: emailSend });
  } else {
    return next(new ErrorHandler(404, "User Not Found"));
  }
});

exports.recoverOTPVerify = catchAsync(async (req, res) => {
  //find email and otp from the parameter
  let email = req.params.email;
  let OTPCode = req.params.otp;
  let status = 0;

  //first otp count
  let OTPCount = await OTPModel.aggregate([
    { $match: { email: email, otp: OTPCode, status: status } },
    { $count: "total" },
  ]);
  if (OTPCount.length > 0) {
    let otpUpdate = await OTPModel.updateOne(
      { email: email, otp: OTPCode, status: status },
      {
        email: email,
        otp: OTPCode,
        status: 1,
      }
    );
    res.status(200).json({ status: true, data: otpUpdate });
  } else {
    return next(new ErrorHandler(402, "Invalid OTP Code"));
  }
});

exports.RecoverResetPassword = catchAsync(async (req, res) => {
  let email = req.body["email"];
  let OTPCode = req.body["OTP"];
  let newPassword = req.body["password"];

  let status = 1;

  let OTPUsedCount = await OTPModel.aggregate([
    { $match: { email: email, otp: OTPCode, status: status } },
    { $count: "total" },
  ]);

  if (OTPUsedCount.length > 0) {
    let password = newPassword;

    if (!regex.test(password)) {
      return res.status(400).json({
        status: "fail",
        message:
          "Invalid password format. Password must have at least one lowercase letter, one uppercase letter, one digit, one special character, and be 8-15 characters long.",
      });
    }

    const hashedPassword = await userBcrypt.hashPassword(password);
    let passwordUpdate = await userModel.updateOne(
      { email: email },
      {
        password: hashedPassword,
      }
    );
    res.status(200).json({
      status: true,
      message: "",
      data: passwordUpdate,
    });
  } else {
    return next(new ErrorHandler(402, "OTP Code is not valid"));
  }
});

exports.searchPost = catchAsync(async (req, res, next) => {
  const { area, city, bed_room, with_furniture, min_price, max_price } = req.query;

  // Always include is_paid: false in the filter
  let query = postModel.find({ is_paid: false });

  if (area) {
    query = query.where('area', new RegExp(area, 'i'));
  }

  if (city) {
    query = query.where('city', new RegExp(city, 'i'));
  }

  if (bed_room) {
    query = query.where('bed_room', bed_room);
  }

  if (with_furniture) {
    query = query.where('with_furniture', with_furniture === 'true');
  }

  if (min_price) {
    query = query.where('monthly_rent').gte(min_price);
  }

  if (max_price) {
    query = query.where('monthly_rent').lte(max_price);
  }

  const areas = await query.exec();

  return res.status(200).json({
    status: true,
    data: areas,
  });
});


