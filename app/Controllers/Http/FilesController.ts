import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Application from '@ioc:Adonis/Core/Application'
import Post from 'App/Models/Post'
import File from 'App/Models/File'
import { v4 as uuidv4 } from 'uuid'
import User from 'App/Models/User'

export default class FilesController {
  public async store(request: any, post_id: number, oldImages: any) {
    // console.log(oldImages)
    let allImages: any[] = []
    if (typeof oldImages === 'string') {
      allImages.push(oldImages)
    } else {
      allImages = oldImages
    }
    const post = await Post.find(post_id)
    const files = await File.query() // 👈now have access to all query builder methods
      .where('post_id', post_id)
    const images = request.files('images', {
      size: '2mb',
      extnames: ['jpg', 'png', 'gif'],
    })
    const newItems = files.filter((b) => !allImages.some((a) => Number(a) === Number(b.file_id)))
    console.log(newItems.length)
    for (let newItem of newItems) {
      // console.log(newItem)
      await File.query() // 👈now have access to all query builder methods
        .where('post_id', post_id)
        .where('file_id', '=', newItem.file_id)
        .delete()
    }
    let err: Object[] = []
    if (images.length === 0) {
      // console.log('err')
      // err.push({ message: 'invalid files' })
      // console.log(err)
      return
    }
    for (let image of images) {
      if (!image.isValid) {
        err.push(image.errors)
      } else {
        const newFileName = uuidv4()
        await image.move(Application.tmpPath('uploads'), {
          name: newFileName + '.' + image.extname,
          overwrite: true, // overwrite in case of conflict
        })
        if (post) {
          await post.related('files').create({ file_name: image.clientName })
        }
      }
    }
    return err
  }

  public async storeDirect({ auth, request, response }: HttpContextContract) {
    // console.log(oldImages)
    // let allImages: any[] = []
    // if (typeof oldImages === 'string') {
    //   allImages.push(oldImages)
    // } else {
    //   allImages = oldImages
    // }
    // const post = await Post.find(post_id)
    // const files = await File.query() // 👈now have access to all query builder methods
    //   .where('post_id', post_id)
    const files = request.files('file', {
      size: '3mb',
      // extnames: ['jpg', 'png', 'gif'],
    })
    // const newItems = files.filter((b) => !allImages.some((a) => Number(a) === Number(b.file_id)))
    // console.log(newItems.length)
    // for (let newItem of newItems) {
    //   await File.query() // 👈now have access to all query builder methods
    //     .where('post_id', post_id)
    //     .where('file_id', '=', newItem.file_id)
    //     .delete()
    // }
    let err: Object[] = []
    // if (file.length === 0) { return }
    for (let file of files) {
      if (!file.isValid) {
        err.push(file.errors)
      } else {
        const newFileName = uuidv4()
        await file.move(Application.tmpPath('uploads/direct'), {
          name: newFileName + '.' + file.extname,
          overwrite: true, // overwrite in case of conflict
        })
        const user = await User.find(auth.user?.user_id)
        // const user = new User()
        // const post = new Post()

        // Post.$getRelation('author').setRelated(user, post)
        if (user) {
          // console.log(user)
          // user.user_id = 1
          // await user.related('files').create({ file_name: file.clientName })
          await File.create({ file_name: file.clientName, user_id: user.user_id })
          // const result = await User.query().where('user_id', user.user_id).preload('files')
          // console.log(result)
        }

        // await user?.files().associate(user)
      }
    }
    return response.status(200).json({ message: 'success' })
  }
  // public async showFilesByPostId({ view, auth, request, response }: HttpContextContract) {
  //   try {
  //     const posts = await Post.query().whereHas('files', (query) => {
  //       query.where('post_id', 9)
  //     })
  //     console.log(posts)
  //   } catch (error) {
  //     return response.status(400).send({ message: error.message })
  //   }
  // }

  public async showFilesByUserId({ view, auth, request, response }: HttpContextContract) {
    try {
      // const file = await Post.query().whereHas('files', (query) => {
      //   query.where('post_id', 9)
      // })
      // console.log(request)
      // const { userId } = request.param('id')
      // console.log(userId)
      const files = await File.query().where('user_id', request.param('id'))
      return response.status(200).json(files)
      // console.log(files)
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async downloadFile({ request, response }: HttpContextContract) {
    try {
      const file = await File.find(request.param('fileId'))
      console.log(file)
      let filePath = ''
      if (file) {
        filePath = Application.tmpPath('uploads/' + decodeURIComponent(file.file_name))
      }

      // console.log(filePath)

      response.download(filePath, true, (error) => {
        if (error.code === 'ENOENT') {
          return ['File does not exists', 404]
        }

        return ['Cannot download file', 400]
      })
      // const image = fs.createReadStream(filePath)
      // console.log(image.file_name)
      // response.stream(image)
    } catch (error) {
      return response.status(400).send({ message: error.message })
    }
  }
}
