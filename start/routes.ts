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
  if (str.includes('Approved') || str.includes('Accepted by firm')) {
    return 'text-green-700'
  } else if (str.includes('Pending')) {
    return 'text-yellow-700'
  } else if (str.includes('Disapproved')) {
    return 'text-red-700'
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

Route.get('/student/:id/information', async ({ view, request }) => {
  const studentUsers = await User.query()
    .where('role', 'student')
    .andWhere('user_id', request.param('id'))
    .preload('student')
  const studentUser = studentUsers[0]
  if (studentUser.student.adviser_id) {
    const adviser = await User.findOrFail(studentUser.student.adviser_id)
    studentUser.student['adviserFullName'] = adviser.firstname + ' ' + adviser.lastname
  }
  const disabled = studentUser.student.plan === null ? '' : 'disabled'
  const studentInfo = [
    { title: 'Firm', value: studentUser.student.firm, key: 'firm' },
    { title: 'Email', value: studentUser.email, key: 'email' },
    { title: 'Tel.', value: studentUser.student.tel, key: 'tel' },
    { title: 'Department', value: studentUser.student.department, key: 'department' },
    { title: 'Position', value: studentUser.student.position, key: 'position' },
    { title: 'Internship duration', value: studentUser.student.plan, key: 'duration' },
    { title: 'Mentor', value: studentUser.student.mentor_name, key: 'mentor' },
    {
      title: 'Mentor’s Position',
      value: studentUser.student.mentor_position,
      key: 'mentorPosition',
    },
    { title: 'Mentor’s Email', value: studentUser.student.mentor_email, key: 'mentorEmail' },
    { title: 'Mentor’s Tel.', value: studentUser.student.mentor_tel_no, key: 'mentorTel' },
    {
      title: 'Advisor',
      value: studentUser.student['adviserFullName'] ? studentUser.student['adviserFullName'] : '',
      key: 'adviserFullName',
    },
  ]
  return view.render('student-info', { studentUser, disabled, studentInfo })
})

Route.get('/student/:id/edit', async ({ view, request }) => {
  const studentUsers = await User.query()
    .where('role', 'student')
    .andWhere('user_id', request.param('id'))
    .preload('student')
  const studentUser = studentUsers[0]
  if (studentUser.student.adviser_id) {
    const adviser = await User.findOrFail(studentUser.student.adviser_id)
    studentUser.student['adviserFullName'] = adviser.firstname + ' ' + adviser.lastname
  }
  const disabled = studentUser.student.plan === null ? '' : 'disabled'
  const studentInfo = [
    { title: 'Firm', value: studentUser.student.firm, key: 'firm' },
    { title: 'Email', value: studentUser.email, key: 'email' },
    { title: 'Tel.', value: studentUser.student.tel, key: 'tel' },
    { title: 'Department', value: studentUser.student.department, key: 'department' },
    { title: 'Position', value: studentUser.student.position, key: 'position' },
    { title: 'Internship duration', value: studentUser.student.plan, key: 'duration' },
    { title: 'Mentor', value: studentUser.student.mentor_name, key: 'mentor' },
    {
      title: 'Mentor’s Position',
      value: studentUser.student.mentor_position,
      key: 'mentorPosition',
    },
    { title: 'Mentor’s Email', value: studentUser.student.mentor_email, key: 'mentorEmail' },
    { title: 'Mentor’s Tel.', value: studentUser.student.mentor_tel_no, key: 'mentorTel' },
    {
      title: 'Advisor',
      value: studentUser.student['adviserFullName'] ? studentUser.student['adviserFullName'] : '',
      key: 'adviserFullName',
    },
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
Route.group(() => {
  Route.post('/login', 'UsersController.verify').as('auth.login')
  Route.post('/register', 'UsersController.register').as('auth.register')
  Route.get('/logout', 'UsersController.logout').as('auth.logout')
  // Route.get('/user/:role', 'UsersController.getUserByRole')
  Route.group(() => {
    Route.patch('/student/:id', 'UsersController.updateStudentUserStatus')
    Route.patch('/student/info/:id', 'UsersController.updateStudentUserInfo')
  })
    .middleware('login')
    .prefix('/user')

  // Route.get('/post', 'PostsController.show')
  // Route.get('/post/:post_id', 'PostsController.showById')
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
    Route.post('/steps', 'FilesController.storeDirect') //store file สำหรับ steps
    // Route.get('/file/user/:id', 'FilesController.showFilesByUserId')
    Route.get('/:fileId', 'FilesController.downloadFile') //downloadfile สำหรับ steps / อื่นๆ
    Route.delete('/:fileId', 'FilesController.deleteFileDirect')
  })
    .middleware('login')
    .prefix('/file')
}).prefix('/api')

// Route.get('/api/test', 'UsersController.test')
// Route.get('/api/gen', 'UsersController.gen')
