const express = require('express')
const router = express.Router()
const userController = require('../controller/userController')
const authVerifyMiddleware = require('../middleware/AuthVerifyMiddleware')
const adminController = require('../controller/adminController')
const paymentController = require("../controller/paymentController")
router.get('/', async (req, res, next) => {
  res.status(200).json({
    status: true,
    message: 'Hello World',
  })
})

//done
router.post('/signUp', userController.userRegistration)
//done
router.post('/verify-email', userController.verifyRegistrationOTP)
//done
router.post('/user/login', userController.login)
//done
router.post('/user/access-token', userController.generateAccessToken)
//done
//personal info
router.put(
  '/user/personal-info',
  authVerifyMiddleware.authMiddleware('user', 'admin'),
  userController.updatePersonalInfo
)
//done
router.get('/user/personal-info', authVerifyMiddleware.authMiddleware('user', 'admin'), userController.getPersonalInfo)

//forgot password
//done
router.get('/recover-verify-email/:email', userController.RecoverVerifyEmail)
router.get('/recover-verify-otp/:email/:otp', userController.recoverOTPVerify)
router.post('/recover-reset-password', userController.RecoverResetPassword)

//admin
//done
router.post('/admin/login', adminController.adminLogin)


//done
router.post('/admin/post', authVerifyMiddleware.authMiddleware('admin'), adminController.createPost)
//done
router.put('/admin/post/:postId', authVerifyMiddleware.authMiddleware('admin'), adminController.updatePost)

//done
router.get(
  "/post",
  authVerifyMiddleware.authMiddleware("admin"),
  adminController.getAllPost
);
//done
router.get(
  "/post/:postId",
  authVerifyMiddleware.authMiddleware("admin", "user"),
  adminController.getSinglePost
);
//done
router.delete(
  "/admin/post/:postId",
  authVerifyMiddleware.authMiddleware("admin"),
  adminController.deletePost
);

//done
router.get("/admin/users", authVerifyMiddleware.authMiddleware("admin"), adminController.allUsers)

//done
router.delete(
  "/admin/user/:userId",
  authVerifyMiddleware.authMiddleware("admin"),
  adminController.deleteUser
);

//done
router.get(
  "/admin/admins",
  authVerifyMiddleware.authMiddleware("admin"),
  adminController.showAllAdmin
);

//done
router.put(
  "/admin/invite-admin",
  authVerifyMiddleware.authMiddleware("admin"),
  adminController.inviteAsAdmin
);
//done
router.get(
  "/admin/bookings",
  authVerifyMiddleware.authMiddleware("admin"),
  adminController.showAllBookingFromAdmin
);

//done
router.get(
  "/search",
  userController.searchPost
);

//done
router.post(
  "/user/payment/:postId",
  authVerifyMiddleware.authMiddleware("user"),
  paymentController.paymentApply
);

//done
router.post(
  "/success/:postId",
  authVerifyMiddleware.authMiddleware("user"),
  paymentController.successPayment
);

router.get("/user/show",  authVerifyMiddleware.authMiddleware("user"), userController.showBookingPost
)

module.exports = router
