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
import View from '@ioc:Adonis/Core/View'
import UsersController from 'App/Controllers/Http/UsersController'

View.global('middleEllipsis', (str: string) => {
  if (str.length > 30) {
    return str.substring(0, 20) + '...' + str.substring(str.length - 10)
  }
  return str
})

View.global('checkStatus', (str: string) => {
  if (str.includes('Approved')) {
    return 'text-green-700'
  } else if (str.includes('Pending')) {
    return 'text-yellow-700'
  } else if (str.includes('Disapproved')) {
    return 'text-red-700'
  } else if (str.includes('Waiting')) {
    return 'text-blue-700'
  } else {
    return ''
  }
})

Route.get('/', async ({ view, auth, response }) => {
  const userCon = new UsersController()
  await userCon.gen()
  if (auth.user) return response.redirect('/announcement')
  else {
    const roles = ['Student', 'Adviser', 'Staff']
    return view.render('home', { roles })
  }
})

Route.get('/register', async ({ view }) => {
  return view.render('home')
})

Route.get('/success-regis', async ({ view }) => {
  return view.render('success-regis')
})

Route.group(() => {
  Route.get('/:id/information', 'UsersController.showStudentInfo')

  Route.get('/:id/edit', 'UsersController.showStudentInfoEdit')

  Route.get('/:id', 'UsersController.showStudentUserById')
}).prefix('/student')

Route.get('/student-information', 'UsersController.showStudentUser')

Route.get('/register-request', 'UsersController.showStudentUser')

Route.get('/course-management', 'UsersController.showStudentUser')

Route.group(() => {
  Route.get('/', 'PostsController.show')

  Route.get('/create', 'PostsController.showCreate')

  Route.get('/edit/:id', 'PostsController.showEdit')

  Route.get('/:id', 'PostsController.showById')
}).prefix('/announcement')

Route.get('/file', 'FilesController.showAllFile')

Route.group(() => {
  Route.post('/login', 'UsersController.verify2').as('auth.login')
  Route.post('/register', 'UsersController.register').as('auth.register')
  Route.get('/logout', 'UsersController.logout').as('auth.logout')
  Route.group(() => {
    Route.patch('/student/:id', 'UsersController.updateStudentUserStatus')
    Route.patch('/student/info/:id', 'UsersController.updateStudentUserInfo')
    Route.patch('/student/regis/approve', 'UsersController.updateStudentUserApprove')
    Route.delete('/student/:id', 'UsersController.deleteStudentUser')
    Route.patch('/courseInfo', 'UsersController.updateCourseInformation')
  })
    // .middleware('login')
    .prefix('/user')

  Route.group(() => {
    Route.post('/', 'PostsController.store')
    Route.patch('/:id', 'PostsController.update')
    Route.delete('/:id', 'PostsController.remove')
    Route.get('/:id', 'PostsController.getById')
  })
    .middleware('role')
    .prefix('/post')

  Route.group(() => {
    Route.post('/', 'FilesController.store')
    Route.post('/steps', 'FilesController.storeDirect')
    Route.get('/:fileId', 'FilesController.downloadFile')
    Route.delete('/:fileId', 'FilesController.deleteFileDirect')
  })
    .middleware('login')
    .prefix('/file')
}).prefix('/api')
