import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Application from '@ioc:Adonis/Core/Application'
import Post from 'App/Models/Post'
import File from 'App/Models/File'

export default class FilesController {
  public async store(request: any, post_id: number) {
    const post = await Post.find(post_id)
    await File.query() // 👈now have access to all query builder methods
      .where('post_id', post_id)
      .delete()
    const images = request.files('images', {
      size: '2mb',
      extnames: ['jpg', 'png', 'gif'],
    })
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
        await image.move(Application.tmpPath('uploads'))
        if (post) {
          await post.related('files').create({ file_name: image.fileName })
        }
      }
    }
    // console.log('-------------')
    // console.log(err)
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
      const filePath = Application.tmpPath(
        'uploads/' + decodeURIComponent(request.param('fileName'))
      )
      // console.log(filePath)

      response.download(filePath, true, (error) => {
        if (error.code === 'ENOENT') {
          return ['File does not exists', 404]
        }

        return ['Cannot download file', 400]
      })
    } catch (error) {
      return response.status(400).send({ message: error.message })
    }
  }
}
