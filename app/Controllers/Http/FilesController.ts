import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Application from '@ioc:Adonis/Core/Application'
import Post from 'App/Models/Post'

export default class FilesController {
  public async store(request: any, post_id: number) {
    const post = await Post.find(post_id)

    const images = request.files('images', {
      size: '10mb',
      extnames: ['jpg', 'png', 'gif'],
    })
    let err: Object[] = []
    for (let image of images) {
      if (!images) {
        return
      }
      if (!image.isValid) {
        console.log(image.errors)
        err.push(image.errors)
      } else {
        await image.move(Application.tmpPath('uploads'))
        if (post) {
          await post.related('files').create({
            file_name: image.fileName,
          })
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
      const filePath = Application.tmpPath(
        'uploads/' + decodeURIComponent(request.param('fileName'))
      )
      console.log(filePath)

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
