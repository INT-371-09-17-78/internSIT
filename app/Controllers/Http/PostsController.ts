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
      let post: Post
      if (user) {
        post = await user.related('posts').create({
          content: content,
          topic: topic,
        })
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
      return response.status(400).send({ message: error.message })
    }
  }

  public async update({ auth, request, response }: HttpContextContract) {
    try {
      const { content, topic, oldImages } = request.only(['content', 'topic', 'oldImages'])
      const user = await User.find(auth.user?.user_id)
      const post = await Post.find(request.param('id'))
      if (post?.user_id !== auth.user?.user_id) {
        return response.status(403).send({ message: 'invalid post' })
      }
      if (user) {
        const post = await user.related('posts').updateOrCreate(
          { post_id: request.param('id') },
          {
            content: content,
            topic: topic,
          }
        )
        if (post) {
          const con = new FilesController()
          const resultErr = await con.store(request, post.post_id, oldImages)
          if (resultErr && resultErr.length > 0) {
            return response.status(400).send({ resultErr })
          } else {
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
      const post = await Post.find(request.param('id'))
      if (post) {
        post.load('files')
        if (post?.user_id !== auth.user?.user_id) {
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
        const result = await Post.query().where('post_id', request.param('id')).preload('files')
        if (!result) {
          return response
            .status(404)
            .send({ message: 'not found maybe this post has been deleted T^T' })
        }
        const post = result[0]?.serialize()

        if (post) post['updated_at'] = moment(post.updated_at).format('MMMM D, YYYY h:mm A')
        return response.json({ post })
      }
    } catch (error) {
      return response.status(400).send({ message: error.message })
    }
  }

  public async show({ view, auth, response }: HttpContextContract) {
    try {
      if (!auth.user) return response.redirect('/')
      else {
        const results = await Post.query()
          .orderBy('updated_at', 'desc')
          .preload('files')
          .withCount('files')
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
        const result = await Post.query().where('post_id', request.param('id')).preload('files')
        if (!result) {
          return response
            .status(404)
            .send({ message: 'not found maybe this post has been deleted T^T' })
        }
        const post = result[0]?.serialize()
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
        const result = await Post.query().where('post_id', request.param('id')).preload('files')
        const post = result[0]?.serialize()
        post.updated_at = moment(post.updated_at).format('MMMM D, YYYY h:mm A')
        if (!result) {
          return response
            .status(404)
            .send({ message: 'not found maybe this post has been deleted T^T' })
        }
        return view.render('post', { post })
      }
    } catch (error) {
      return response.status(400).send({ message: error.message })
    }
  }
}
