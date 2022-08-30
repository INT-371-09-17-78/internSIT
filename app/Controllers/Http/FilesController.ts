import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Application from '@ioc:Adonis/Core/Application'
import Post from 'App/Models/Post'
import File from 'App/Models/File'
import { v4 as uuidv4 } from 'uuid'
import * as fs from 'fs'

export default class FilesController {
  public async store(request: any, post_id: number, oldImages: any) {
    let allImages: any[] = []
    let err: Object[] = []
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
      // extnames: ['jpg', 'png', 'gif'],
    })
    const newItems = files.filter((b) => !allImages.some((a) => Number(a) === Number(b.file_id)))
    if (newItems && newItems.length > 0) {
      for (let newItem of newItems) {
        await File.query() // 👈now have access to all query builder methods
          .where('file_id', newItem.file_id)
          .delete()
      }
      const deleteFileResult = await this.deleteFile(newItems)
      if (deleteFileResult) {
        err.push(deleteFileResult.message)
      }
    }

    if (images.length === 0) {
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
          image.size = this.convertFileSize(image.size)
          await post.related('files').create({
            file_id: newFileName + '.' + image.extname,
            file_name: image.clientName,
            user_id: post.user_id,
            file_size: image.size,
          })
        }
      }
    }
    return err
  }

  private convertFileSize(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }

  // public async storeDirect({ auth, request, response }: HttpContextContract) {
  //   const files = request.files('file', {
  //     size: '3mb',
  //     // extnames: ['jpg', 'png', 'gif'],
  //   })
  //   let err: Object[] = []
  //   // if (file.length === 0) { return }
  //   for (let file of files) {
  //     if (!file.isValid) {
  //       err.push(file.errors)
  //     } else {
  //       const newFileName = uuidv4()
  //       await file.move(Application.tmpPath('uploads/direct'), {
  //         name: newFileName + '.' + file.extname,
  //         overwrite: true, // overwrite in case of conflict
  //       })
  //       const user = await User.find(auth.user?.user_id)
  //       if (user) {
  //         await File.create({ file_name: file.clientName, user_id: user.user_id })
  //       }

  //     }
  //   }
  //   return response.status(200).json({ message: 'success' })
  // }
  // // public async showFilesByPostId({ view, auth, request, response }: HttpContextContract) {
  // //   try {
  // //     const posts = await Post.query().whereHas('files', (query) => {
  // //       query.where('post_id', 9)
  // //     })
  // //     console.log(posts)
  // //   } catch (error) {
  // //     return response.status(400).send({ message: error.message })
  // //   }
  // // }

  // public async showFilesByUserId({ view, auth, request, response }: HttpContextContract) {
  //   try {
  //     // const file = await Post.query().whereHas('files', (query) => {
  //     //   query.where('post_id', 9)
  //     // })
  //     // console.log(request)
  //     // const { userId } = request.param('id')
  //     // console.log(userId)
  //     const files = await File.query().where('user_id', request.param('id'))
  //     return response.status(200).json(files)
  //     // console.log(files)
  //   } catch (error) {
  //     return response.status(400).json({ message: error.message })
  //   }
  // }

  public async showAllFile({ view, response }: HttpContextContract) {
    try {
      const files = await File.query()
      return view.render('file', { files })
    } catch (error) {
      return response.status(400).send({ message: error.message })
    }
  }

  public async downloadFile({ request, response }: HttpContextContract) {
    try {
      const file = await File.find(request.param('fileId'))
      let filePath = ''
      if (file) {
        filePath = Application.tmpPath('uploads/' + decodeURIComponent(file.file_id))
        response.attachment(filePath, file.file_name, undefined, undefined, (error) => {
          if (error.code === 'ENOENT') {
            return ['File does not exists', 404]
          }

          return ['Cannot download file', 400]
        })
      }
    } catch (error) {
      return response.status(400).send({ message: error.message })
    }
  }

  public async deleteFileDirect({ request, response }: HttpContextContract) {
    try {
      const file = await File.find(request.param('fileId'))
      let filePath = ''
      if (file) {
        filePath = Application.tmpPath('uploads/' + decodeURIComponent(file.file_id))
        fs.unlink(filePath, (error) => {
          if (error) {
            throw new Error(error.message)
          }
        })
        await file.delete()
      }
    } catch (error) {
      return response.status(400).send({ message: error.message })
    }
  }

  public async deleteFile(files: Array<any>) {
    try {
      if (!files || files.length <= 0) {
        throw new Error('files are invalid')
      }
      let filePath = ''
      for (const file of files) {
        filePath = Application.tmpPath('uploads/' + decodeURIComponent(file.file_id))
        fs.unlink(filePath, (error) => {
          if (error) {
            throw new Error(error.message)
          }
        })
        await file.delete()
        return
      }
    } catch (error) {
      return new Error(error.message)
    }
  }
}
