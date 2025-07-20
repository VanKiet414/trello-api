import { userModel } from '~/models/userModel'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import bcryptjs from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { pickUser } from '~/utils/formatters'
import { WEBSITE_DOMAIN } from '~/utils/constants'
/* import { BrevoProvider } from '~/providers/BrevoProvider' */
import { ResendProvider } from '~/providers/ResendProvider'
import { env } from '~/config/environment'
import { JwtProvider } from '~/providers/JwtProvider'
import { CloudinaryProvider } from '~/providers/CloudinaryProvider'

const createNew = async (reqBody) => {
  try {
    // kiểm tra xem email đã tồn tại trong hệ thống của chúng ta hay chưa
    const existUser = await userModel.findOneByEmail(reqBody.email)
    if (existUser) {
      throw new ApiError(StatusCodes.CONFLICT, 'Email already exists!')
    }

    // Tạo data để lưu vào Database
    // nameFromEmail: nếu email là trungquandev@gmail.com thì sẽ lấy được "trungquandev"
    const nameFromEmail = reqBody.email.split('@')[0]
    const newUser = {
      email: reqBody.email,
      password: bcryptjs.hashSync(reqBody.password, 8), // Tham số thứ 2 là độ phức tạp, giá trị càng cao thì băm càng lâu(Mã hóa mật khẩu trước khi lưu)
      username: nameFromEmail,
      displayName: nameFromEmail, // Mặc định để giống username khi user đăng ký mới, về sau làm tính năng update cho user
      verifyToken: uuidv4() // Tạo token xác thực tài khoản ngẫu nhiên
    }

    // Thực hiện lưu thông tin user vào Database
    const createdUser = await userModel.createNew(newUser)
    const getNewUser = await userModel.findOneById(createdUser.insertedId)

    // Gửi email cho người dùng xác thực tài khoản (bước sau...)
    const verificationLink = `${WEBSITE_DOMAIN}/account/verification?email=${getNewUser.email}&token=${getNewUser.verifyToken}`

    const customSubject = '🔐 Xác thực tài khoản Trello VanKietDev'

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; padding: 30px; border-radius: 8px;">
        <h2 style="color: #333333;">Chào mừng bạn đến với <span style="color: #007bff;">Trello VanKietDev</span> 🎉</h2>
        <p>Chúng tôi rất vui khi bạn đã đăng ký. Vui lòng xác thực tài khoản của bạn để bắt đầu sử dụng:</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" 
            style="background-color: #007bff; color: white; text-decoration: none; padding: 12px 24px; border-radius: 5px; font-weight: bold;">
            Xác thực tài khoản ngay
          </a>
        </div>

        <p>Nếu bạn không đăng ký tài khoản, vui lòng bỏ qua email này.</p>
        <hr style="margin: 30px 0;" />
        <p style="font-size: 14px; color: #666;">Trân trọng,<br/>— Đội ngũ <strong>VanKietDev</strong></p>
      </div>
    `
    // Gọi tới Provider gửi email
    await ResendProvider.sendEmail(getNewUser.email, customSubject, htmlContent)

    // return trả về dữ liệu cho phía Controller
    return pickUser(getNewUser)
  } catch (error) { throw error }
}

const verifyAccount = async (reqBody) => {
  try {
    // Query user trong Database
    const existUser = await userModel.findOneByEmail(reqBody.email)

    // Các bước kiểm tra cần thiết
    if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND, 'Account not found!')
    if (existUser.isActive) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your account is already active!')
    if (reqBody.token !== existUser.verifyToken) {
      throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Token is invalid!')
    }

    // Nếu như mọi thứ ok thì chúng ta bắt đầu update lại thông tin của thằng user để verify account
    const updateData = {
      isActive: true,
      verifyToken: null
    }
    // Cập nhật thông tin user
    const updatedUser = await userModel.update(existUser._id, updateData)

    return pickUser(updatedUser)
  } catch (error) { throw error }
}

const login = async (reqBody) => {
  try {
    // Query user trong Database
    const existUser = await userModel.findOneByEmail(reqBody.email)

    // Các bước kiểm tra cần thiết
    if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND, 'Account not found!')
    if (!existUser.isActive) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your account is not active!')
    if (!bcryptjs.compareSync(reqBody.password, existUser.password)) {
      throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your Email or Password is incorrect!')
    }

    // Nếu mọi thứ ok thì bắt đầu tạo Tokens đăng nhập để trả về cho phía FE
    // Tạo thông tin sẽ đính kèm trong JWT Token bao gồm _id và email của user
    const userInfo = { _id: existUser._id, email: existUser.email }

    // Tạo ra 2 loại token, accessToken và refreshToken để trả về cho phía FE
    const accessToken = await JwtProvider.generateToken(
      userInfo,
      env.ACCESS_TOKEN_SECRET_SIGNATURE,
      // 5 // 5 giây
      env.ACCESS_TOKEN_LIFE
    )

    const refreshToken = await JwtProvider.generateToken(
      userInfo,
      env.REFRESH_TOKEN_SECRET_SIGNATURE,
      // 15 // 15 giây
      env.REFRESH_TOKEN_LIFE
    )

    // Trả về thông tin của user kèm theo 2 cái token vừa tạo ra
    return { accessToken, refreshToken, ...pickUser(existUser) }
  } catch (error) { throw error }
}

const refreshToken = async (clientRefreshToken) => {
  try {
    // Verifi / Giải mã để kiểm tra refresh token có hợp lệ không
    const refreshTokenDecoded = await JwtProvider.verifyToken(
      clientRefreshToken,
      env.REFRESH_TOKEN_SECRET_SIGNATURE
    )

    // Bởi vì chúng ta chỉ lưu những thông tin unique và cố định của user trong token rồi, vì vậy có thể lấy luôn từ decoded ra, tiết kiệm query vào DB để lấy data mới.
    const userInfo = {
      _id: refreshTokenDecoded._id,
      email: refreshTokenDecoded.email
    }

    // Tạo accessToken mới
    const accessToken = await JwtProvider.generateToken(
      userInfo,
      env.ACCESS_TOKEN_SECRET_SIGNATURE,
      // 5 // 5 giây để test accessToken hết hạn
      env.ACCESS_TOKEN_LIFE // ví dụ: '1h'
    )

    return { accessToken }
  } catch (error) { throw error }
}

const update = async (userId, reqBody, userAvatarFile) => {
  try {
    // Query User và kiểm tra cho chắc chắn
    const existUser = await userModel.findOneById(userId)
    if (!existUser) throw new ApiError(StatusCodes.NOT_FOUND, 'Account not found!')
    if (!existUser.isActive) throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your account is not active!')

    // Khởi tạo kết quả updated User ban đầu = empty
    let updatedUser = {}

    // Trường hợp change password
    if (reqBody.current_password && reqBody.new_password) {
      // Kiểm tra xem cái current_password có đúng hay không
      if (!bcryptjs.compareSync(reqBody.current_password, existUser.password)) {
        throw new ApiError(StatusCodes.NOT_ACCEPTABLE, 'Your Current Password is incorrect!')
      }
      // Nếu như current_password là đúng thì chúng ta sẽ hash một cái mật khẩu mới và update lại vào DB:
      updatedUser = await userModel.update(existUser._id, {
        password: bcryptjs.hashSync(reqBody.new_password, 8)
      })
    } else if (userAvatarFile) {
      // Trường hợp upload file lên Cloud Storage, cụ thể là Cloudinary
      const uploadResult = await CloudinaryProvider.streamUpload(userAvatarFile.buffer, 'users')
      console.log('uploadResult: ', uploadResult)

      // Lưu lại url (secure_url) của cái file ảnh vào trong Database
      updatedUser = await userModel.update(existUser._id, {
        avatar: uploadResult.secure_url
      })

    } else {
      // Trường hợp update các thông tin chung, ví dụ như displayName
      updatedUser = await userModel.update(existUser._id, reqBody)
    }

    return pickUser(updatedUser)
  } catch (error) { throw error }
}

export const userService = {
  createNew,
  verifyAccount,
  login,
  refreshToken,
  update
}
