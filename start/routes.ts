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

Route.get('/', async ({ view }) => {
  return view.render('home')
})

Route.get('/announcement', async ({ view }) => {
  return view.render('announcement')
})

Route.get('/register', async ({ view }) => {
  return view.render('auth/register')
}).as('auth.register.show')

Route.get('/login', async ({ view }) => {
  return view.render('auth/login')
}).as('auth.login.show')

//backend
import Database from '@ioc:Adonis/Lucid/Database'

// import UsersController from 'App/Controllers/Http/UsersController'

Route.get('/test', async () => {
  Database.from('city').select('*')
  // .where('id', params.id)
  // .first()
})

Route.resource('controller', 'UsersController').apiOnly()

Route.post('login', 'UsersController.verify').as('auth.login')
Route.get('logout', 'UsersController.logout').as('auth.logout')
