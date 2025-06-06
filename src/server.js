/* eslint-disable no-console */
import express from 'express'
import exitHook from 'async-exit-hook'
import { CONNECT_DB, CLOSE_DB } from '~/config/mongodb'
import { env } from '~/config/environment'
import { APIs_V1 } from '~/routes/v1'
import { errorHandlingMiddleware } from '~/middlewares/errorHandlingMiddleware'


const START_SERVER = () => {
  const app = express()

  // Enable req.body json data
  app.use(express.json())

  // Use APIs V1
  app.use('/v1', APIs_V1)

  // Middleware xử lý lỗi tập trung
  app.use(errorHandlingMiddleware)

  app.listen(env.APP_PORT, env.APP_HOST, () => {
    console.log(`3. Hi ${env.AUTHOR}, Back-end Server is running successfully at Host: http://${env.APP_HOST}:${env.APP_PORT}`)
  })

  // Thực hiện các tác vụ cleanup trước khi dừng server
  // Đọc thêm ở đây: https://stackoverflow.com/q/14031763/8324172
  exitHook(() => {
    console.log('4. Server is shutting down...')
    CLOSE_DB()
    console.log('5. Disconnected from MongoDB Cloud Atlas')
  })
}

// Chỉ khi kết nối tới Database thành công thì mới Start Server Back-end lên.
// Inmediately-invoked / Anonymous Async Functions (IIFE)
(async () => {
  try {
    console.log('1. Connect to MongoDB Cloud Atlas...')
    await CONNECT_DB()
    console.log('2. Connect to MongoDB Cloud Atlas!')

    // Khởi động Server Back-end sau khi Connect Database thành công
    START_SERVER()
  } catch (error) {
    console.error(error)
    process.exit(0)
  }
})()

/* // Chỉ khi kết nối tới Database thành công thì mới Start Server Back-end lên.
console.log('1. Connect to MongoDB Cloud Atlas...')
CONNECT_DB()
  .then(() => console.log('2. Connect to MongoDB Cloud Atlas!'))
  .then(() => START_SERVER())
  // eslint-disable-next-line no-unused-vars
  .catch(error => {
    console.error(error)
    process.exit(0)
  }) */