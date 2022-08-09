import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Post from 'App/Models/Post'
import User from 'App/Models/User'
import FilesController from './FilesController'
import moment from 'moment'

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
      const user = await User.find(auth.user?.user_id)
      if (user) {
        const post = await user.related('posts').create({
          content: content,
          topic: topic,
        })
        const con = new FilesController()
        const resultErr = await con.store(request, post.post_id)
        if (resultErr) {
          throw { message: resultErr }
        }
      } else {
        return response.status(403).send({ message: 'invalid user' })
      }
      return response.redirect('/announcement')
    } catch (error) {
      return response.status(400).send({ message: error.message })
    }
  }

  public async update({ auth, request, response }: HttpContextContract) {
    try {
      const { content, topic } = request.only(['content', 'topic'])
      const user = await User.find(auth.user?.user_id)
      const post = await Post.find(request.param('id'))
      if (post?.user_id !== auth.user?.user_id) {
        return response.status(403).send({ message: 'invalid post' })
      }
      if (user) {
        await user.related('posts').updateOrCreate(
          { post_id: request.param('id') },
          {
            content: content,
            topic: topic,
          }
        )
      } else {
        return response.status(403).send({ message: 'invalid user' })
      }
      return response.redirect('/announcement')
    } catch (error) {
      response.status(400).send({ message: error.message })
    }
  }

  public async remove({ auth, request, response }: HttpContextContract) {
    try {
      const post = await Post.find(request.param('id'))
      if (post) {
        if (post?.user_id !== auth.user?.user_id) {
          return response.status(403).send({ message: 'invalid post' })
        }
        await post.delete()
      } else {
        throw new Error('invalid post')
      }
      return response.redirect('/announcement')
    } catch (error) {
      return response.status(400).send({ message: error.message })
    }
  }

  public async show({ view, auth, response }: HttpContextContract) {
    try {
      if (!auth.user) return response.redirect('/')
      else {
        const results = await Post.query().preload('files').withCount('files')
        const resultsJSON = results.map((result) => result.serialize())
        const posts = resultsJSON.map((result) => ({
          ...result,
          updated_at: moment(result.updated_at).format('MMMM D, YYYY h:mm A'),
        }))
        return view.render('announcement', { posts })
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
        const result = await Post.find(request.param('id'))
        if (!result) {
          return response
            .status(404)
            .send({ message: 'not found maybe this post has been deleted T^T' })
        }
        const post = result?.serialize()
        if (post) post['updated_at'] = moment(post.updated_at).format('MMMM D, YYYY h:mm A')
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
        // const result = await Post.find(request.param('id'))
        const result = await Post.query().where('post_id', request.param('id')).preload('files')
        // console.log(result)
        const post = result[0].serialize()
        post.updated_at = moment(post.updated_at).format('MMMM D, YYYY h:mm A')
        if (!result) {
          return response
            .status(404)
            .send({ message: 'not found maybe this post has been deleted T^T' })
        }
        console.log(post)
        // const post = result?.serialize()
        // if (post) post['updated_at'] = moment(post.updated_at).format('MMMM D, YYYY h:mm A')
        return view.render('post', { post })
      }
    } catch (error) {
      return response.status(400).send({ message: error.message })
    }
  }
}
