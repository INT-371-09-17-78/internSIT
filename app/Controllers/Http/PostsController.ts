import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Post from 'App/Models/Post'
import User from 'App/Models/User'
import FilesController from './FilesController'
import moment from 'moment-timezone'
import AcademicYear from 'App/Models/AcademicYear'
import UsersInAcademicYearModel from 'App/Models/UsersInAcademicYear'
// import { DateTime } from 'luxon'

export default class PostsController {
  //   public async index() {
  //     return await User.all()
  //   }
  //   public async store() {
  //     return await User.create({
  //       username: 'nuchanart.boo',
  //       password: 'Fxig08',
  //       email: 'nuchanart.boo',
  //     })
  //   }
  public async store({ auth, request, response }: HttpContextContract) {
    try {
      const { content, topic } = request.all()
      const user = await User.findOrFail(auth.user?.user_id)
      const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      // console.log(AcademicYearCf )
      const usersInAcademicYear = await UsersInAcademicYearModel.query()
        .where('user_id', user.user_id)
        .andWhere('academic_year', AcademicYearCf[0].academic_year)
      // const userHasDoc = await usersInAcademicYear[0].related('documentStatus').query()
      // console.log(user.user_id)
      let post: Post
      if (user) {
        // post = await usersInAcademicYear[0].related('posts').create({
        //   content: content,
        //   topic: topic,
        //   // user_in_academic_year_id: 1,
        // })
        post = await Post.create({
          content: content,
          topic: topic,
          usersInAcademicYearId: usersInAcademicYear[0].id,
        })
        console.log(post)
        const con = new FilesController()
        const resultErr = await con.store(request, post.post_id, [])
        if (resultErr && resultErr.length > 0) {
          return { message: resultErr }
        }
      } else {
        return response.status(403).send({ message: 'invalid user' })
      }

      return response.json(post)
      // return response.redirect().toRoute('PostsController.showById', { post_id: 32 })
    } catch (error) {
      // console.log(error)
      return response.status(400).send({ message: error.message })
    }
  }

  public async update({ auth, request, response }: HttpContextContract) {
    try {
      const { content, topic, oldImages } = request.only(['content', 'topic', 'oldImages'])
      const user = await User.findOrFail(auth.user?.user_id)
      const post = await Post.find(request.param('id'))
      const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      const usersInAcademicYear = await UsersInAcademicYearModel.query()
        .where('user_id', user.user_id)
        .andWhere('academic_year', AcademicYearCf[0].academic_year)
      if (post?.usersInAcademicYearId !== usersInAcademicYear[0].id) {
        return response.status(403).send({ message: 'invalid post maybe editing post from past' })
      }
      if (user) {
        // const post = await usersInAcademicYear[0].related('posts').updateOrCreate(
        //   { post_id: request.param('id') },
        //   {
        //     content: content,
        //     topic: topic,
        //   }
        // )
        const post = await Post.updateOrCreate(
          { post_id: request.param('id') },
          {
            content: content,
            topic: topic,
          }
        )
        // console.log(oldImages)
        // console.log("เข้า")
        if (post) {
          // console.log("เข้า");

          const con = new FilesController()
          const resultErr = await con.store(request, post.post_id, oldImages)
          if (resultErr && resultErr.length > 0) {
            // console.log(resultErr)
            return response.status(400).send({ resultErr })
          } else {
            // console.log(post)
            return response.json(post)
          }
        } else {
          return response.status(404).send({ message: 'invalid post' })
        }
        // for (const file of files) {
        //   await post?.related('files').updateOrCreate(
        //     { file_id: file.file_id },
        //     {
        //       file_name: file.file_name,
        //     }
        //   )
        // }
      } else {
        return response.status(403).send({ message: 'invalid user' })
      }
      // return response.redirect('/announcement')
    } catch (error) {
      response.status(400).send({ message: error.message })
    }
  }

  public async remove({ auth, request, response }: HttpContextContract) {
    try {
      const user = await User.findOrFail(auth.user?.user_id)
      const post = await Post.find(request.param('id'))
      const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      const usersInAcademicYear = await UsersInAcademicYearModel.query()
        .where('user_id', user.user_id)
        .andWhere('academic_year', AcademicYearCf[0].academic_year)
      if (post) {
        post.load('files')
        if (post?.usersInAcademicYearId !== usersInAcademicYear[0].id) {
          return response.status(403).send({ message: 'invalid post' })
        }
        await post.delete()
        const con = new FilesController()
        // post.files[0]
        await con.deleteFile(post.files)
      } else {
        throw new Error('invalid post')
      }
      return response.redirect('/announcement')
    } catch (error) {
      return response.status(400).send({ message: error.message })
    }
  }

  public async getById({ auth, request, response }: HttpContextContract) {
    try {
      if (!auth.user || auth.user.role === 'student') response.redirect('/')
      else {
        let canEdit: any
        let AcademicYearCf: any
        // const AcademicYearCf = await AcademicYear.query().where(
        //   'academic_year',
        //   request.cookie('year')
        // )
        if (auth.user?.role === 'student') {
          AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
        } else {
          // AcademicYearCf = await AcademicYear.query().where('academic_year', request.cookie('year'))
          if (request.cookie('year')) {
            AcademicYearCf = await AcademicYear.query().where(
              'academic_year',
              request.cookie('year')
            )
          } else {
            AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
          }
        }
        const AcademicYearAll = await AcademicYear.query().orderBy('updated_at', 'desc')
        AcademicYearCf[0].academic_year !== AcademicYearAll[0].academic_year
          ? (canEdit = false)
          : (canEdit = true)
        const result = await Post.query().where('post_id', request.param('id')).preload('files')
        //   .preload('usersInAcademicYear')
        //  console.log(result)
        if (!result) {
          return response
            .status(404)
            .send({ message: 'not found maybe this post has been deleted T^T' })
        }
        const post = result[0]?.serialize()
        // console.log(post)
        if (post)
          post['updated_at'] = moment(post.updated_at)
            .tz('Asia/Bangkok')
            .format('MMMM D, YYYY h:mm A')
        return response.json({ post, canEdit })
      }
    } catch (error) {
      return response.status(400).send({ message: error.message })
    }
  }

  public async show({ view, auth, request, response }: HttpContextContract) {
    try {
      // const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      let canEdit: any
      let AcademicYearCf: any
      // const AcademicYearCf = await AcademicYear.query().where(
      //   'academic_year',
      //   request.cookie('year')
      // )
      if (auth.user?.role === 'student') {
        AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      } else {
        // AcademicYearCf = await AcademicYear.query().where('academic_year', request.cookie('year'))
        // AcademicYearCf = request.cookie('year')
        //   ? await AcademicYear.query().where('academic_year', request.cookie('year'))
        //   : AcademicYear.query().orderBy('updated_at', 'desc')
        console.log(request.cookie('year'))
        if (request.cookie('year')) {
          AcademicYearCf = await AcademicYear.query().where('academic_year', request.cookie('year'))
        } else {
          AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
          // } else {
          //   }
          //   AcademicYearCf = await AcademicYear.query().where('academic_year', request.cookie('year'))
          // console.log(AcademicYearCf)
        }
      }
      // console.log(AcademicYearCf[0].academic_year)
      const AcademicYearAll = await AcademicYear.query().orderBy('updated_at', 'desc')
      // console.log(AcademicYearAll[0].academic_year)
      AcademicYearCf[0].academic_year !== AcademicYearAll[0].academic_year
        ? (canEdit = false)
        : (canEdit = true)
      if (!auth.user) {
        return response.redirect('/')
      } else {
        const results = await Post.query()
          // .where('conf_id', AcademicYearCf[0].conf_id)
          .orderBy('updated_at', 'desc')
          .preload('files')
          .withCount('files')
          .preload('usersInAcademicYear')
        const resultsJSONpre = results.map((result) => result.serialize())
        const resultJSON = resultsJSONpre.filter(
          (result) => result.usersInAcademicYear.academic_year === AcademicYearCf[0].academic_year
        )
        // console.log(resultJSON)
        const posts = resultJSON.map((result) => ({
          ...result,
          updated_at: moment(result.updated_at).tz('Asia/Bangkok').format('MMMM D, YYYY h:mm A'),
        }))
        // console.log(canEdit)
        return view.render('announcement', { posts, canEdit })
      }
    } catch (error) {
      return response.status(400).send({ message: error.message })
    }
  }

  public async showCreate({ view, auth, response }: HttpContextContract) {
    try {
      if (!auth.user || auth.user.role === 'student') response.redirect('/')
      else return view.render('add-edit-post')
    } catch (error) {
      return response.status(400).send({ message: error.message })
    }
  }

  public async showEdit({ view, auth, request, response }: HttpContextContract) {
    try {
      if (!auth.user || auth.user.role === 'student') response.redirect('/')
      else {
        const result = await Post.query().where('post_id', request.param('id')).preload('files')
        if (!result) {
          return response
            .status(404)
            .send({ message: 'not found maybe this post has been deleted T^T' })
        }
        const post = result[0]?.serialize()
        if (post)
          post['updated_at'] = moment(post.updated_at)
            .tz('Asia/Bangkok')
            .format('MMMM D, YYYY h:mm A')
        return view.render('add-edit-post', { post })
      }
    } catch (error) {
      return response.status(400).send({ message: error.message })
    }
  }

  public async showById({ view, auth, request, response }: HttpContextContract) {
    try {
      if (!auth.user) response.redirect('/')
      else {
        const result = await Post.query()
          .where('post_id', request.param('id'))
          .preload('files')
          .preload('usersInAcademicYear')
        const post = result[0]?.serialize()
        post.updated_at = moment(post.updated_at).tz('Asia/Bangkok').format('MMMM D, YYYY h:mm A')
        // console.log(post)

        let canEdit: any
        const AcademicYearCf = await AcademicYear.query().where(
          'academic_year',
          request.cookie('year')
        )
        const AcademicYearAll = await AcademicYear.query().orderBy('updated_at', 'desc')
        AcademicYearCf[0].academic_year !== AcademicYearAll[0].academic_year
          ? (canEdit = false)
          : (canEdit = true)
        if (!result) {
          return response
            .status(404)
            .send({ message: 'not found maybe this post has been deleted T^T' })
        }
        return view.render('post', { post, canEdit })
      }
    } catch (error) {
      return response.status(400).send({ message: error.message })
    }
  }
}
