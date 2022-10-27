import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Application from '@ioc:Adonis/Core/Application'
import Post from 'App/Models/Post'
import User from 'App/Models/User'
import File from 'App/Models/File'
import { v4 as uuidv4 } from 'uuid'
import * as fs from 'fs'
// import Document from 'App/Models/Document'
import DocumentStatus from 'App/Models/DocumentStatus'
import moment from 'moment-timezone'
import AcademicYear from 'App/Models/AcademicYear'
import UsersInAcademicYearModel from 'App/Models/UsersInAcademicYear'
import UserHasDoc from 'App/Models/UserHasDoc'

export default class FilesController {
  public async store(request: any, post_id: number, oldImages: any) {
    let allImages: any[] = []
    let err: Object[] = []
    if (typeof oldImages === 'string') {
      allImages.push(oldImages)
    } else {
      allImages = oldImages
    }
    // if (!allImages) {
    //   return
    // }
    const post = await Post.find(post_id)
    const files = await File.query() // 👈now have access to all query builder methods
      .where('post_id', post_id)
    const images = request.files('images', {
      size: '2mb',
      // extnames: ['jpg', 'png', 'gif'],
    })
    // console.log(allImages)
    const newItems = files.filter((b) => !allImages.some((a) => String(a) === String(b.file_id)))
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
            // user_id: post.user_id,
            file_size: image.size,
          })
        }
      }
    }
    return err
  }

  public async storeDirect({ request, response }: HttpContextContract) {
    try {
      const { docId, studentId, statId } = request.only(['docId', 'studentId', 'statId'])
      // console.log(docId)
      // console.log(statId)
      const files = request.files('files', {
        size: '3mb',
        // extnames: ['jpg', 'png', 'gif'],
      })
      let err: Object[] = []
      if (files.length === 0) {
        throw new Error('not have files')
      }
      for (let file of files) {
        if (!file.isValid) {
          err.push(file.errors)
        } else {
          const newFileName = uuidv4()
          await file.move(Application.tmpPath('uploads/steps'), {
            name: newFileName + '.' + file.extname,
            overwrite: true, // overwrite in case of conflict
          })
          const user = await User.findOrFail(studentId)
          // const doc = await Document.find(docId)
          // doc?.related('')
          const docStat = await DocumentStatus.query()
            .where('document_id', docId)
            .andWhere('status_id', statId)
          // docStat[0].related('usersInAcademicYear').create({})
          const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
          const usersInAcademicYear = await UsersInAcademicYearModel.query()
            .where('user_id', user.user_id)
            .andWhere('academic_year', AcademicYearCf[0].academic_year)
          // console.log(docStat[0].id)
          // console.log(usersInAcademicYear[0].id)
          const userHasDocResult = await UserHasDoc.query()
            .where('doc_stat_id', docStat[0].id)
            .andWhere('user_in_academic_year_id', usersInAcademicYear[0].id)
            .orderBy('updated_at', 'desc')

          // console.log(UserHasDocResult[0])
          // console.log(UserHasDocResult[0].id)

          if (userHasDocResult) {
            const fileSize = this.convertFileSize(file.size)
            // await File.create({
            //   file_id: newFileName + '.' + file.extname,
            //   file_name: file.clientName,
            //   user_id: user.user_id,
            //   file_size: fileSize,
            // })
            // let userIdCache: any
            const result = await File.query().where('user_has_doc_id', userHasDocResult[0].id)
            // .andWhere('doc_id', doc.doc_name)
            if (result && result.length > 0) {
              // userIdCache = result[0].user_id
              this.deleteFile(result, 'steps/')
            }
            // if (user.role === 'staff' || user.role === 'advisor') {
            //   await File.create({
            //     file_id: newFileName + '.' + file.extname,
            //     file_name: file.clientName,
            //     user_id: userIdCache,
            //     file_size: fileSize,
            //     doc_id: doc.doc_name,
            //   })
            // } else {
            // docStat[0].related('usersInAcademicYear').create({})
            // userHasDoc[0].related('')
            // await File.create({
            //   file_id: newFileName + '.' + file.extname,
            //   file_name: file.clientName,
            //   // user_id: user.user_id,
            //   file_size: fileSize,
            //   // doc_id: doc.doc_name,
            //   user_has_doc_id: userHasDoc[0].id,
            // })
            await File.create({
              file_id: newFileName + '.' + file.extname,
              file_name: file.clientName,
              // user_id: user.user_id,
              file_size: fileSize,
              // doc_id: doc.doc_name,
              user_has_doc_id: userHasDocResult[0].id,
            })
            // userHasDoc[0].related('f')
            // newFile.related('userHasDoc')
            // }

            return response.status(200).json({ message: 'success' })
          }
        }
      }
      return response.status(400).json({ message: 'something went wrong maybe cant find data' })
    } catch (error) {
      // console.log(error)
      return response.status(400).json({ message: error.messages })
    }
  }

  private convertFileSize(bytes: number, decimals = 2) {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }

  public async showAllFile({ view, request, response }: HttpContextContract) {
    try {
      let canEdit: any
      // const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      const AcademicYearCf = await AcademicYear.query().where(
        'academic_year',
        request.cookie('year')
      )
      const AcademicYearAll = await AcademicYear.query().orderBy('updated_at', 'desc')
      AcademicYearCf[0].academic_year !== AcademicYearAll[0].academic_year
        ? (canEdit = true)
        : (canEdit = false)
      const files = await File.query().whereNull('user_has_doc_id')
      let newFiles: any = []
      // console.log(testQuery)
      for (const file of files) {
        const posts = await Post.query().where('post_id', file.post_id)
        const checkAcademicYearData = await posts[0]
          .related('usersInAcademicYear')
          .query()
          .where('academic_year', AcademicYearCf[0].academic_year)
        if (checkAcademicYearData && checkAcademicYearData.length > 0) {
          newFiles.push(file)
        }
      }
      const filesJSON = newFiles.map((result) => result.serialize())
      // console.log(filesJSON)

      for (const file of filesJSON) {
        // file.serialize()
        // file.post.relate
        // const post = await Post.find(file.post_id)
        const postArr = await Post.query().where('post_id', file.post_id)
        // .andWhere('conf_id', AcademicYearCf[0].conf_id)
        const post = postArr[0]
        // console.log(post)
        const user = await UsersInAcademicYearModel.query().where('id', post.usersInAcademicYearId)
        // console.log(user)
        if (user) {
          file['user_id'] = user[0].user_id
        }
      }
      // console.log(filesJSON)
      const filesDateTime = filesJSON.map((result) => ({
        ...result,
        updated_at: moment(result.updated_at).tz('Asia/Bangkok').format('MMMM D, YYYY h:mm A'),
      }))
      return view.render('file', { files: filesDateTime, canEdit })
    } catch (error) {
      return response.status(400).send({ message: error.message })
    }
  }

  public async downloadFile({ request, response }: HttpContextContract) {
    try {
      const { userId, docId, prev, statId } = request.qs()
      let file: any
      let path = ''
      let preview: any = prev === 'prev' ? 'inline' : undefined
      if (userId && docId) {
        // const result = await File.query().where('user_id', userId).andWhere('doc_id', docId)
        // if (result && result.length > 0) {
        //   file = result[0]
        //   path = 'steps/'
        // }
        console.log(statId)
        const user = await User.findOrFail(userId)
        // const doc = await Document.find(docId)
        // doc?.related('')
        const docStat = await DocumentStatus.query()
          .where('document_id', docId)
          .andWhere('status_id', statId === 'Disapproved' ? 'Pending' : statId)
        // docStat[0].related('usersInAcademicYear').create({})
        const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
        const usersInAcademicYear = await UsersInAcademicYearModel.query()
          .where('user_id', user.user_id)
          .andWhere('academic_year', AcademicYearCf[0].academic_year)

        const userHasDocResult = await UserHasDoc.query()
          .where('doc_stat_id', docStat[0].id)
          .andWhere('user_in_academic_year_id', usersInAcademicYear[0].id)
          .orderBy('updated_at', 'desc')

        const result = await File.query().where('user_has_doc_id', userHasDocResult[0].id)
        // console.log(result)
        if (result && result.length > 0) {
          file = result[0]
          path = 'steps/'
        }
      } else {
        file = await File.find(request.param('fileId'))
      }

      let filePath = ''
      if (file) {
        filePath = Application.tmpPath('uploads/' + path + decodeURIComponent(file.file_id))

        response.attachment(filePath, file.file_name, preview, undefined, (error) => {
          if (error.code === 'ENOENT') {
            return ['File does not exists', 404]
          }

          return ['Cannot download file', 400]
        })
      } else {
        return response.status(404).send({ message: 'cannot find file' })
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

  public async deleteFile(files: Array<any>, path = '') {
    try {
      if (!files || files.length <= 0) {
        throw new Error('files are invalid')
      }
      let filePath = ''
      for (const file of files) {
        filePath = Application.tmpPath('uploads/' + path + decodeURIComponent(file.file_id))
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
