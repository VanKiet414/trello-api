/* eslint-disable no-console */
import express from 'express'
// eslint-disable-next-line no-unused-vars
import { CONNECT_DB, GET_DB } from '~/config/mongodb'


const START_SERVER = () => {
  const app = express()

  const hostname = 'localhost'
  const port = 8017

  app.get('/', async (req, res) => {
    console.log(await GET_DB().listCollections().toArray())

    res.end('<h1>Hello World!</h1><hr>')
  })

  app.listen(port, hostname, () => {
    console.log(`3. Hi Van Kiet Dev, Back-end Server is running successfully at Host: http://${hostname}:${port}`)
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