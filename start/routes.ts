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
import User from 'App/Models/User'
// import Post from 'App/Models/Post'
// import moment from 'moment'
View.global('middleEllipsis', (str: string) => {
  if (str.length > 30) {
    return str.substring(0, 20) + '...' + str.substring(str.length - 10)
  }
  return str
})

View.global('checkStatus', (str: string) => {
  if (str.includes('Approve') || str.includes('Accepted by firm')) {
    return 'text-green-700'
  } else if (str.includes('Pending')) {
    return 'text-yellow-700'
  } else if (str.includes('Not approve')) {
    return 'text-red-700'
  } else {
    return ''
  }
})

Route.get('/', async ({ view, auth, response }) => {
  const userCon = new UsersController()
  userCon.gen()
  if (auth.user) return response.redirect('/announcement')
  else {
    const roles = ['Student', 'Adviser', 'Staff']
    return view.render('home', { roles })
  }
})

Route.get('/student/:id/information', async ({ view, request }) => {
  const studentUsers = await User.query()
    .where('role', 'student')
    .andWhere('user_id', request.param('id'))
    .preload('student')
  const studentUser = studentUsers[0]
  if (studentUser.student.adviser_id) {
    const adviser = await User.findOrFail(studentUser.student.adviser_id)
    studentUser.student['adviserFirstName'] = adviser.firstname
    studentUser.student['adviserLastName'] = adviser.lastname
  }
  const disabled = studentUser.student.plan === null ? '' : 'disabled'
  const studentInfo = [
    'Firm',
    'Email',
    'Tel.',
    'Department',
    'Position',
    'Internship duration',
    'Mentor',
    'Mentor’s Position',
    'Mentor’s Email',
    'Mentor’s Tel.',
    'Advisor',
  ]
  return view.render('student-info', { studentUser, disabled, studentInfo })
})

Route.get('/student/:id/edit', async ({ view, request }) => {
  const studentUsers = await User.query()
    .where('role', 'student')
    .andWhere('user_id', request.param('id'))
    .preload('student')
  const studentUser = studentUsers[0]

  const disabled = studentUser.student.plan === null ? '' : 'disabled'
  const studentInfo = [
    'Firm',
    'Email',
    'Tel.',
    'Department',
    'Position',
    'Internship duration',
    'Mentor',
    'Mentor’s Position',
    'Mentor’s Email',
    'Mentor’s Tel.',
    'Advisor',
  ]
  // request.qs().editing && request.qs().editing !== '' ? (editing = true) : (editing = false)
  return view.render('edit-student', { studentUser, disabled, studentInfo })
})

Route.get('/file', 'FilesController.showAllFile')

Route.get('/students', 'UsersController.showStudentUser')

Route.get('/student/:id', 'UsersController.showStudentUserById')

Route.group(() => {
  Route.get('/', 'PostsController.show')

  Route.get('/create', 'PostsController.showCreate')

  Route.get('/edit/:id', 'PostsController.showEdit')

  Route.get('/:id', 'PostsController.showById')
}).prefix('/announcement')

// Route.get('/err', async ({ view, auth, response }) => {
//     return view.render('errors/unauthorized')
// })
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
// Route.get('/api/user/:role', 'UsersController.getUserByRole')
Route.patch('/api/user/student/:id', 'UsersController.updateStudentUserStatus')
Route.patch('/api/user/student/info/:id', 'UsersController.updateStudentUserInfo')
// Route.get('/api/post', 'PostsController.show')
// Route.get('/api/post/:post_id', 'PostsController.showById')

Route.post('/api/post', 'PostsController.store').middleware('role')
Route.patch('/api/post/:id', 'PostsController.update').middleware('role')
Route.delete('/api/post/:id', 'PostsController.remove').middleware('role')
Route.get('/api/post/:id', 'PostsController.getById').middleware('role')

Route.post('/api/file', 'FilesController.store')
Route.post('/api/file/steps', 'FilesController.storeDirect') //store file สำหรับ steps
// Route.get('/api/file/user/:id', 'FilesController.showFilesByUserId')
Route.get('/api/file/:fileId', 'FilesController.downloadFile') //downloadfile สำหรับ steps / อื่นๆ
Route.delete('/api/file/:fileId', 'FilesController.deleteFileDirect')

Route.get('/api/test', 'UsersController.test')
Route.get('/api/gen', 'UsersController.gen')
