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

Route.get('/', async ({ view, auth, response }) => {
  if (auth.user) response.redirect('/announcement')
  else return view.render('home')
})

Route.group(() => {
  Route.get('/', async ({ view, auth, response }) => {
    if (!auth.user) response.redirect('/')
    else return view.render('announcement')
  })
  Route.get('/create', async ({ view, auth, response }) => {
    if (!auth.user) response.redirect('/')
    else return view.render('add-post')
  })
  Route.get('/:id', async ({ view, auth, response }) => {
    if (!auth.user) response.redirect('/')
    else return view.render('post')
  })
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
Route.get('/api/post', 'PostsController.show')
Route.get('/api/post/:post_id', 'PostsController.showById')
Route.post('/api/post', 'PostsController.store').middleware('role')
Route.patch('/api/post', 'PostsController.update').middleware('role')
Route.delete('/api/post', 'PostsController.remove').middleware('role')
