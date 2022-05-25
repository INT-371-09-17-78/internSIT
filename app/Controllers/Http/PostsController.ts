import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import Post from 'App/Models/Post'
import Student from 'App/Models/Student'


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
  public async store() {
    // return await User.find(params.id)
    // console.log((auth.user instanceof Student));
    const user = await Student.find(65130000003)
    if(user){
        await user
        .related('posts')
        .create({
          post_id:1124,
          content:"test",
          topic:"asdasdasd"
        })
    }
    
  }



  public async show() {
    // return await User.find(params.id)
    // const user = await Student.find(65130000003)
    // const posts = await user?.related('posts').query()
    // return posts
    return await Post.all()
  }

}
