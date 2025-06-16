import Joi from 'joi'
import { StatusCodes } from 'http-status-codes'
import ApiError from '~/utils/ApiError'
import { BOARD_TYPES } from '~/utils/constants'
import { OBJECT_ID_RULE, OBJECT_ID_RULE_MESSAGE } from '~/utils/validators'

const createNew = async (req, res, next) => {
  /**
 * 1. Mặc định, chúng ta **không cần custom message ở phía Back-end**,
 *    vì Front-end có thể tự validate và custom message cho đẹp, thân thiện người dùng hơn.
 *
 * 2. Back-end chỉ cần **đảm bảo dữ liệu đúng chuẩn**,
 *    có thể sử dụng message mặc định của thư viện (VD: Joi, Zod, ...).
 *
 * 3.  Rất quan trọng: Việc validate dữ liệu ở phía Back-end là **BẮT BUỘC**,
 *    vì đây là nơi cuối cùng lưu dữ liệu vào Database – cần đảm bảo an toàn, chính xác tuyệt đối.
 *
 * 4. Thực tế tốt nhất: Nên **validate cả Front-end và Back-end**.
 *    - FE giúp phản hồi nhanh, tránh gửi request lỗi.
 *    - BE đảm bảo tính toàn vẹn và bảo mật dữ liệu.
 */
  const correctCondition = Joi.object({
    title: Joi.string().min(3).max(50).required().trim().strict().messages({
      'any.required': 'Title is required (trungquandev)',
      'string.empty': 'Title is not allowed to be empty (vankietdev)',
      'string.min': 'Title must be at least 3 characters long (vankietdev)',
      'string.max': 'Title must be less than or equal to 5 characters long (vankietdev)',
      'string.trim': 'Title must not have leading or trailing whitespace (vankietdev)'
    }),
    description: Joi.string().min(3).max(256).required().trim().strict(),
    type: Joi.string().valid(BOARD_TYPES.PUBLIC, BOARD_TYPES.PRIVATE).required()
  })

  try {
    // Chỉ định abortEarly: false để trường hợp có nhiều lỗi thì sẽ trả về tất cả các lỗi thay vì dừng lại ở lỗi đầu tiên
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    // Validate dữ liệu xong xuôi hợp lệ thì cho request đi tiếp sang Controller
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

const update = async (req, res, next) => {
  // Lưu ý không dùng require trong trường hợp Update
  const correctCondition = Joi.object({
    title: Joi.string().min(3).max(50).trim().strict(),
    description: Joi.string().min(3).max(256).trim().strict(),
    type: Joi.string().valid(BOARD_TYPES.PUBLIC, BOARD_TYPES.PRIVATE),
    columnOrderIds: Joi.array().items(
      Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
    )
  })

  try {
    // Chỉ định abortEarly: false để trường hợp có nhiều lỗi thì sẽ trả về tất cả các lỗi thay vì dừng lại ở lỗi đầu tiên
    // Đối với trường hợp update, cho phép Unknown để không cần đẩy một số field lên
    await correctCondition.validateAsync(req.body, {
      abortEarly: false,
      allowUnknown: true
    })

    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

const moveCardToDifferentColumn = async (req, res, next) => {
  const correctCondition = Joi.object({
    currentCardId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),

    prevColumnId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    prevCardOrderIds: Joi.array().required().items(
      Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
    ),

    nextColumnId: Joi.string().required().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE),
    nextCardOrderIds: Joi.array().required().items(
      Joi.string().pattern(OBJECT_ID_RULE).message(OBJECT_ID_RULE_MESSAGE)
    )
  })

  try {
    await correctCondition.validateAsync(req.body, { abortEarly: false })
    next()
  } catch (error) {
    next(new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, new Error(error).message))
  }
}

export const boardValidation = {
  createNew,
  update,
  moveCardToDifferentColumn
}