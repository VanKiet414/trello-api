import express from 'express'
import { userValidation } from '~/validations/userValidation'
import { userController } from '~/controllers/userController'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { multerUploadMiddleware } from '~/middlewares/multerUploadMiddleware'

const Router = express.Router()

// Đăng ký tài khoản
Router.route('/register')
  .post(userValidation.createNew, userController.createNew)

// Xác thực tài khoản
Router.route('/verify')
  .put(userValidation.verifyAccount, userController.verifyAccount)

// Đăng nhập
Router.route('/login')
  .post(userValidation.login, userController.login)

// Đăng xuất
Router.route('/logout')
  .delete(userController.logout)

// Refresh token
Router.route('/refresh_token')
  .get(userController.refreshToken)

// Cập nhật thông tin user (cần đăng nhập)
Router.route('/update')
  .put(
    authMiddleware.isAuthorized,
    multerUploadMiddleware.upload.single('avatar'),
    userValidation.update,
    userController.update
  )

export const userRoute = Router