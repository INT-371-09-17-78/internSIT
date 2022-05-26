import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Post from 'App/Models/Post'
import User from 'App/Models/User'

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
        response.status(401).send({ message: 'invalid user' })
      }
      // response.status(200).send({ message: 'success' })
      return response.redirect('/announcement')
    } catch (error) {
      response.status(400).send({ message: error.message })
    }
  }

  public async update({ auth, request, response }: HttpContextContract) {
    try {
      const { postData } = request.only(['postData'])
      const user = await User.find(auth.user?.user_id)
      if (user) {
        await user.related('posts').updateOrCreate({ post_id: postData.post_id }, postData)
      } else {
        response.status(401).send({ message: 'invalid user' })
      }
      response.status(200).send({ message: 'success' })
    } catch (error) {
      response.status(400).send({ message: error.message })
    }
  }

  public async remove({ request, response }: HttpContextContract) {
    try {
      const { postData } = request.only(['postData'])
      const post = await Post.find(postData.post_id)
      if (post) {
        await post.delete()
      } else {
        throw new Error('invalid post')
      }
      response.status(200).send({ message: 'success' })
    } catch (error) {
      response.status(400).send({ message: error.message })
    }
  }

  public async show() {
    return await Post.all()
  }

  public async showById({ request, response }: HttpContextContract) {
    const post = await Post.find(request.param('post_id'))
    response.status(200).send({ result: post })
  }
}
