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
          // user_id: user.user_id,
          content: content,
          topic: topic,
        })
      } else {
        return response.status(401).send({ message: 'invalid user' })
        // response.abort('invalid user', 401)
        // return response.redirect().status(401).toPath('/announcement')
        // response.status(401).send()
      }
      return response.redirect('/announcement')
      // response.status(200).send({ message: 'success' })
      // response.abort('test', 401)
    } catch (error) {
      // response.abort(error.message, error.status)
      // return response.status(400).redirect('/announcement')
      return response.status(400).send({ message: error.message })
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

  public async show({ view, auth, response }: HttpContextContract) {
    // return await Post.all()
    if (!auth.user) response.redirect('/')
    else {
      const results = await Post.all()
      const resultsJSON = results.map((result) => result.serialize())
      // console.log(resultsJSON)
      const posts = resultsJSON.map((result) => ({
        ...result,
        updated_at: moment(result.updated_at).format('MMMM D, YYYY h:mm A'),
      }))
      console.log(posts)
      return view.render('announcement', { posts })
    }
  }

  public async showById({ view, auth, request, response }: HttpContextContract) {
    // const post = await Post.find(request.param('post_id'))
    // response.status(200).send({ result: post })
    if (!auth.user) response.redirect('/')
    else {
      const result = await Post.find(request.param('id'))
      let post = result?.serialize()
      // console.log(resultsJSON)
      post = {
        ...post,
        updated_at: moment(post?.updated_at).format('MMMM D, YYYY h:mm A'),
      }
      console.log(post)
      return view.render('post', { post })
    }
  }
}
