/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| This file is dedicated for defining HTTP routes. A single file is enough
| for majority of projects, however you can define routes in different
| files and just make sure to import them inside this file. For example
|
| Define routes in following two files
| ├── start/routes/cart.ts
| ├── start/routes/customer.ts
|
| and then import them inside `start/routes.ts` as follows
|
| import './routes/cart'
| import './routes/customer''
|
*/
import Route from '@ioc:Adonis/Core/Route'
import Post from 'App/Models/Post'
import moment from 'moment'

Route.get('/', async ({ view, auth, response }) => {
  if (auth.user) return response.redirect('/announcement')
  else {
    const roles = ['Student', 'Adviser', 'Staff']
    return view.render('home', { roles })
  }
})

Route.group(() => {
  Route.get('/', 'PostsController.show')

  Route.get('/create', async ({ view, auth, response }) => {
    if (!auth.user || auth.user.role === 'student') response.redirect('/')
    else return view.render('add-edit-post')
  })

  Route.get('/edit/:id', async ({ view, auth, request, response }) => {
    if (!auth.user || auth.user.role === 'student') response.redirect('/')
    else {
      const result = await Post.find(request.param('id'))
      const post = result?.serialize()
      if (post) post['updated_at'] = moment(post.updated_at).format('MMMM D, YYYY h:mm A')
      return view.render('add-edit-post', { post })
    }
  })

  Route.get('/:id', 'PostsController.showById')
}).prefix('/announcement')

//backend
// import Database from '@ioc:Adonis/Lucid/Database'

// import UsersController from 'App/Controllers/Http/UsersController'

// Route.get('/test', async () => {
//   Database.from('city').select('*')
//   // .where('id', params.id)
//   // .first()
// })

// Route.resource('controller', 'UsersController').apiOnly()

Route.post('/api/login', 'UsersController.verify').as('auth.login')
Route.get('/api/logout', 'UsersController.logout').as('auth.logout')
// Route.get('/api/post', 'PostsController.show')
// Route.get('/api/post/:post_id', 'PostsController.showById')
Route.post('/api/post', 'PostsController.store').middleware('role')
Route.patch('/api/post/:id', 'PostsController.update').middleware('role')
Route.delete('/api/post/:id', 'PostsController.remove').middleware('role')
