import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Application from '@ioc:Adonis/Core/Application'
import Post from 'App/Models/Post'
import File from 'App/Models/File'
import { v4 as uuidv4 } from 'uuid'

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
