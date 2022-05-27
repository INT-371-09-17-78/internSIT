import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Post from 'App/Models/Post'
import User from 'App/Models/User'
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
      const { content, topic } = request.only(['content', 'topic'])
      const user = await User.find(auth.user?.user_id)
      if (user) {
        await user.related('posts').create({
          content: content,
          topic: topic,
        })
      } else {
        return response.status(401).send({ message: 'invalid user' })
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
      if (user) {
        await user.related('posts').updateOrCreate(
          { post_id: request.param('id') },
          {
            content: content,
            topic: topic,
          }
        )
      } else {
        response.status(401).send({ message: 'invalid user' })
      }
      return response.redirect('/announcement')
    } catch (error) {
      response.status(400).send({ message: error.message })
    }
  }

  public async remove({ request, response }: HttpContextContract) {
    try {
      const post = await Post.find(request.param('id'))
      if (post) {
        await post.delete()
      } else {
        throw new Error('invalid post')
      }
      return response.redirect('/announcement')
    } catch (error) {
      response.status(400).send({ message: error.message })
    }
  }

  public async show({ view, auth, response }: HttpContextContract) {
    if (!auth.user) response.redirect('/')
    else {
      const results = await Post.all()
      const resultsJSON = results.map((result) => result.serialize())
      const posts = resultsJSON.map((result) => ({
        ...result,
        updated_at: moment(result.updated_at).format('MMMM D, YYYY h:mm A'),
      }))
      return view.render('announcement', { posts })
    }
  }

  public async showById({ view, auth, request, response }: HttpContextContract) {
    if (!auth.user) response.redirect('/')
    else {
      const result = await Post.find(request.param('id'))
      let post = result?.serialize()
      post = {
        ...post,
        updated_at: moment(post?.updated_at).format('MMMM D, YYYY h:mm A'),
      }
      return view.render('post', { post })
    }
  }
}
