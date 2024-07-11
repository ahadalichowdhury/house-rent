const jwt = require('jsonwebtoken')
const ErrorHandler = require('../utils/errorHandler')
require('dotenv').config()

exports.authMiddleware = (...requiredRoles) => {
  return (req, res, next) => {
    let authorization = req.headers['authorization']
    let token = authorization?.split(' ')[1]
    // console.log(authorization)

    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
      // console.log(token)
      if (err) {
        res.status(401).json({ status: 'unauthorized' })
        // console.log(err)
      } else {
        const userId = decoded['userId']
        const role = decoded['role']
        req.headers.userId = userId
        req.headers.role = role

        // console.log(role)
        if (requiredRoles.length && !requiredRoles.includes(role)) {
          return next(new ErrorHandler(401, 'You are not permitted!'))
        }

        next()
      }
    })
  }
}

// exports.adminMiddleware = (req, res, next) => {
//   let authorization = req.headers['authorization']
//   let token = authorization?.split(' ')[1]

//   // console.log(token)
//   jwt.verify(token, process.env.ADMIN_SECRET_KEY, (err, decoded) => {
//     if (err) {
//       res.status(401).json({ status: 'You Are Not authorized As Admin' })
//       // console.log(err)
//     } else {
//       const userId = decoded['userId']
//       const email = decoded['email']
//       const role = decoded['role']
//       if (role !== 'admin') {
//         res.status(401).json({ status: 'You Are Not authorized As Admin' })
//       }
//       req.headers.userId = userId
//       req.headers.email = email
//       req.headers.role = role
//       next()
//     }
//   })
// }
