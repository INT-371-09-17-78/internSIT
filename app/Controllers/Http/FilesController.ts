import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Application from '@ioc:Adonis/Core/Application'
import Post from 'App/Models/Post'
import User from 'App/Models/User'
import File from 'App/Models/File'
import { v4 as uuidv4 } from 'uuid'
import * as fs from 'fs'
import moment from 'moment-timezone'
import AcademicYear from 'App/Models/AcademicYear'
import UsersInAcademicYearModel from 'App/Models/UsersInAcademicYear'
import UserHasDoc from 'App/Models/UserHasDoc'
import FileServices from 'App/Services/fileServices'

export default class FilesController {
  public async store(request: any, post_id: number, oldImages: any) {
    const fileServices = new FileServices()
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
          image.size = fileServices.convertFileSize(image.size)
          await post.related('files').create({
            file_id: newFileName,
            file_name: image.clientName,
            file_size: image.size,
          })
        }
      }
    }
    return err
  }

  public async storeDirect({ session, request, response }: HttpContextContract) {
    try {
      const { step, studentId, status, stepFileType, stepFileTypePlan } = request.only([
        'step',
        'studentId',
        'status',
        'stepFileType',
        'stepFileTypePlan',
      ])

      const files = request.files('files', {
        size: '3mb',
      })

      let err: Object[] = []
      const fileServices = new FileServices()
      let stepFileTypePlanJSON = stepFileTypePlan ? JSON.parse(stepFileTypePlan) : null

      if (files.length === 0) {
        throw new Error('not have files')
      }
      console.log(files.length)

      for (let file of files) {
        if (!file.isValid) {
          err.push(file.errors)
        } else {
          const newFileName = uuidv4()
          await file.move(
            Application.tmpPath(
              stepFileType.includes('template') ? 'uploads/template' : 'uploads/steps'
            ),
            {
              name: newFileName + '.' + file.extname,
              overwrite: true, // overwrite in case of conflict
            }
          )
          let user
          let usersInAcademicYear
          let userHasDocResult
          if (studentId) {
            user = await User.find(studentId)
          }

          const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
          if (user) {
            usersInAcademicYear = await UsersInAcademicYearModel.query()
              .where('user_id', user.user_id)
              .andWhere('academic_year', AcademicYearCf[0].academic_year)

            userHasDocResult = await UserHasDoc.query()
              .where('step', step)
              .andWhere('status', status)
              .andWhere('user_in_academic_year_id', usersInAcademicYear[0].id)
              .orderBy('updated_at', 'desc')
          }
          const fileSize = fileServices.convertFileSize(file.size)
          // if (stepFileType.includes('template')) {
          //   const result = await File.query().where(
          //     'step_file_type',
          //     stepFileType + stepFileTypePlanJSON.month + stepFileTypePlanJSON.step
          //   )

          //   if (result && result.length > 0) {
          //     this.deleteFile(result, 'template/')
          //   }
          // }

          await File.create({
            file_id: newFileName,
            file_name: file.clientName,
            file_size: fileSize,
            user_has_doc_id:
              userHasDocResult && userHasDocResult.length > 0 ? userHasDocResult[0].id : undefined,
            step_file_type: stepFileTypePlanJSON
              ? stepFileType + stepFileTypePlanJSON.month + stepFileTypePlanJSON.step
              : stepFileType,
          })
        }
      }
      return response.status(200).json({ message: 'success' })
      // return response.status(400).json({ message: 'something went wrong maybe cant find data' })
    } catch (error) {
      console.log(error)
      if (
        error.message === 'not have files'
        // error.message === 'empty role'
      ) {
        session.flash({
          error: 'All fields are required',
          type: 'negative',
        })
      }
      return response.status(400).json({ message: error.messages })
    }
  }

  public async showAllFile({ auth, view, request, response }: HttpContextContract) {
    try {
      let canEdit: any
      let AcademicYearCf: any
      if (auth.user?.role === 'student') {
        AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      } else {
        if (request.cookie('year')) {
          AcademicYearCf = await AcademicYear.query().where('academic_year', request.cookie('year'))
        } else {
          AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
        }
      }
      const AcademicYearAll = await AcademicYear.query().orderBy('updated_at', 'desc')
      AcademicYearCf[0].academic_year !== AcademicYearAll[0].academic_year
        ? (canEdit = true)
        : (canEdit = false)
      const files = await File.query().whereNull('user_has_doc_id')
      let newFiles: any = []
      for (const file of files) {
        const posts = await Post.query().where('post_id', file.post_id)
        if (posts[0]) {
          const checkAcademicYearData = await posts[0]
            .related('usersInAcademicYear')
            .query()
            .where('academic_year', AcademicYearCf[0].academic_year)
          if (checkAcademicYearData && checkAcademicYearData.length > 0) {
            newFiles.push(file)
          }
        }
      }
      const filesJSON = newFiles.map((result) => result.serialize())

      for (const file of filesJSON) {
        const postArr = await Post.query().where('post_id', file.post_id)
        const post = postArr[0]
        const user = await UsersInAcademicYearModel.query().where('id', post.usersInAcademicYearId)
        if (user) {
          file['user_id'] = user[0].user_id
        }
      }
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
      const { userId, step, prev, status, isTemplate, isStep } = request.qs()
      let file: any
      let path = ''
      let preview: any = prev === 'prev' ? 'inline' : undefined
      if (userId && step) {
        const user = await User.findOrFail(userId)
        const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
        const usersInAcademicYear = await UsersInAcademicYearModel.query()
          .where('user_id', user.user_id)
          .andWhere('academic_year', AcademicYearCf[0].academic_year)

        const userHasDocResult = await UserHasDoc.query()
          .where('step', step)
          .andWhere(
            'status',
            status === 'Disapproved' || status === 'Approved' ? 'Pending' : status
          )
          .andWhere('user_in_academic_year_id', usersInAcademicYear[0].id)
          .orderBy('updated_at', 'desc')

        const result = await File.query().where('user_has_doc_id', userHasDocResult[0].id)
        if (result && result.length > 0) {
          file = result[0]
          path = 'steps/'
        }
      } else {
        file = await File.find(request.param('fileId'))
        path = isTemplate === 'true' ? 'template/' : isStep ? 'steps/' : ''
      }

      let filePath = ''
      if (file) {
        const ext = file.file_name.split('.')
        filePath = Application.tmpPath(
          'uploads/' + path + decodeURIComponent(file.file_id) + '.' + ext[1]
        )

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
        const ext = file.file_name.split('.')
        filePath = Application.tmpPath('uploads/' + decodeURIComponent(file.file_id) + '.' + ext[1])
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
        const ext = file.file_name.split('.')
        filePath = Application.tmpPath(
          'uploads/' + path + decodeURIComponent(file.file_id) + '.' + ext[1]
        )
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
