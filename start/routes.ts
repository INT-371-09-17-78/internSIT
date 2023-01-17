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
import stepService from 'App/Services/stepServices'
// import DocumentStatus from 'App/Models/StepStatus'
import AcademicYear from 'App/Models/AcademicYear'

View.global('middleEllipsis', (str: string) => {
  if (str.length > 30) {
    return str.substring(0, 20) + '...' + str.substring(str.length - 10)
  }
  return str
})

View.global('formatBytes', (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
})

View.global('getCurrentYear', () => {
  return new Date().getFullYear()
})

View.global('getCurrentAcademicYear', async () => {
  const ac = await AcademicYear.query()
    .where('academic_year', 'LIKE', '%' + '/' + '%')
    .orderBy('updated_at', 'desc')
  console.log(ac)

  console.log(ac[0].academic_year, 'asd')

  // return ac[0].academic_year.includes('/2')
  //   ? ac[0].academic_year.split('/')[0] + '/s'
  //   : parseInt(ac[0].academic_year.split('/')[0]) + 1 + '/2'
  return parseInt(ac[0].academic_year.split('/')[0]) + 1
})

View.global('checkStatus', (str: string) => {
  if (str.includes('Approved')) {
    return 'text-green-700'
  } else if (str.includes('Pending')) {
    return 'text-yellow-700'
  } else if (str.includes('Disapproved')) {
    return 'text-red-700'
  } else {
    return ''
  }
})

View.global('returnIcon', (str: string) => {
  console.log(str, 'asdasdas')

  if (!str) return '<div class="text-center">-</div>'
  if (str.includes('Approved') || str.includes('Done')) {
    return '<svg class="m-auto" width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.8601 2.78743L11.2829 0.14355C11.1934 0.0516684 11.0717 0 10.945 0C10.8183 0 10.6967 0.05162 10.6071 0.14355L5.35658 5.52948L3.39277 3.51518C3.30316 3.42335 3.18163 3.37168 3.05483 3.37168C2.92813 3.37168 2.80656 3.42335 2.71699 3.51523L0.139817 6.15921C-0.0466136 6.35051 -0.0466136 6.66052 0.139864 6.85178L5.0187 11.8565C5.10826 11.9484 5.22978 12 5.35658 12C5.48334 12 5.60486 11.9484 5.69442 11.8565L13.8601 3.47995C14.0466 3.28874 14.0466 2.97868 13.8601 2.78743Z" fill="#007934"/></svg>'
  } else if (str.includes('Pending')) {
    return '<svg class="m-auto" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.8233 9.51931C15.941 7.95137 15.5202 6.48913 14.7348 5.28439C14.5868 5.05758 14.6213 4.75811 14.8127 4.56667C15.0715 4.30787 15.5068 4.34853 15.7066 4.65519L15.8233 9.51931ZM15.8233 9.51931C15.5772 12.7994 12.9562 15.4906 9.68226 15.8092L15.8233 9.51931ZM14.6713 4.42525C14.4146 4.68197 14.3664 5.08572 14.5673 5.39361C15.3299 6.56339 15.7381 7.98227 15.6238 9.50433L15.6238 9.50435C15.385 12.6878 12.8396 15.301 9.66289 15.6101L9.66288 15.6101C5.48064 16.0173 1.98254 12.5192 2.38999 8.33727L2.38999 8.33725C2.6919 5.23681 5.19102 2.7226 8.28922 2.39521L8.28923 2.39521C9.88936 2.22606 11.3841 2.63652 12.6068 3.43339L12.6068 3.43339C12.9147 3.63399 13.3184 3.58582 13.5751 3.32902C13.9217 2.98251 13.8701 2.39698 13.4545 2.12611L13.3453 2.29367L13.4544 2.12611C11.8449 1.07726 9.85029 0.573553 7.72843 0.897145L7.72842 0.897147C4.23508 1.43015 1.43344 4.22003 0.898613 7.71379L1.09631 7.74405L0.898612 7.71379C0.053288 13.2363 4.76297 17.9463 10.2857 17.1015C13.7798 16.5673 16.5699 13.7656 17.103 10.2723C17.4268 8.15041 16.9228 6.15546 15.8742 4.54602C15.6034 4.13038 15.0178 4.07872 14.6713 4.42525Z" fill="#E49200" stroke="#E49200" stroke-width="0.4"/><path d="M9.35772 8.71171V4.57886C9.35772 4.14898 9.00912 3.8 8.57886 3.8C8.14866 3.8 7.8 4.14866 7.8 4.57886V9.49031C7.8 9.92019 8.1486 10.2692 8.57886 10.2692H13.4903C13.9206 10.2692 14.2689 9.9204 14.2689 9.49031C14.2689 9.06037 13.9203 8.71171 13.4903 8.71171H9.35772Z" fill="#E49200" stroke="#E49200" stroke-width="0.4"/></svg>'
  } else if (str.includes('Disapproved')) {
    return '<svg class="m-auto" width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.9009 9.18851L8.71196 5.99972L11.8999 2.81127C12.032 2.67916 12.032 2.46509 11.8999 2.33297L9.66663 0.0990864C9.53452 -0.0330288 9.3203 -0.0330288 9.18819 0.0990864L5.99976 3.28754L2.81183 0.0990864C2.685 -0.0279278 2.4604 -0.0279278 2.33339 0.0990864L0.0996331 2.33263C0.0362147 2.39605 0.00050995 2.48226 0.00050995 2.57187C0.00050995 2.66148 0.0362147 2.74768 0.0996331 2.8111L3.28807 5.99972L0.099123 9.18868C0.0357046 9.25227 0 9.33831 0 9.42792C0 9.5177 0.0357046 9.6039 0.099123 9.66715L2.33254 11.9009C2.39596 11.9643 2.48233 12 2.57227 12C2.66153 12 2.74756 11.9643 2.81098 11.9009L5.99976 8.71191L9.1887 11.9007C9.25484 11.9667 9.34104 11.9998 9.42792 11.9998C9.5148 11.9998 9.60117 11.9667 9.66731 11.9007L11.9011 9.66698C12.033 9.53487 12.033 9.3208 11.9009 9.18851Z" fill="#C91E1F"/></svg>'
  } else {
    return '<div class="text-center">-</div>'
  }
})

Route.get('/', async ({ view, auth, request, response }) => {
  const stepServiceGen = new stepService()
  const year = await stepServiceGen.gen()
  // if (year) {
  //   const month = new Date().getMonth()
  //   if (month < 4) {
  //     console.log('งำงาน')

  //     response.cookie('year', year.academic_year || new Date().getFullYear().toString() + '/2')
  //   } else {
  //     console.log('งำงาน2')
  //     response.cookie('year', year.academic_year || new Date().getFullYear().toString() + '/s')
  //   }
  // }
  const month = new Date().getMonth()
  if (month < 4) {
    if (!request.cookie('year') || request.cookie('year') === '') {
      response.cookie(
        'year',
        year ? year.academic_year : new Date().getFullYear().toString() + '/2'
      )
    }
  } else {
    if (!request.cookie('year') || request.cookie('year') === '') {
      response.cookie(
        'year',
        year ? year.academic_year : new Date().getFullYear().toString() + '/s'
      )
    }
  }
  if (auth.user) return response.redirect('/student-information')
  else {
    const roles = ['Student', 'Advisor', 'Staff']
    return view.render('home', { roles })
  }
})

Route.get('/success-regis', async ({ view }) => {
  return view.render('success-regis')
})

Route.get('/dashboard', 'DashboardsController.showDashboard')

Route.group(() => {
  Route.get('/:id/information', 'CoursesInfoController.showStudentInfo')

  Route.get('/:id/edit', 'CoursesInfoController.showStudentInfoEdit')

  Route.get('/:id', 'StepsController.showStudentUserById')
}).prefix('/student')

Route.group(() => {
  Route.get('/', 'StepsController.showStudentUser')
  Route.get('/:id', 'StepsController.showStudentUserById')
  Route.get('/:id/editInformedSupervision', 'StepsController.showStudentUserById')
}).prefix('/student-information')

Route.get('/academic-year', 'StepsController.showStudentUser')

Route.get('/register-request', 'StepsController.showStudentUser')

Route.get('/course-info', 'StepsController.showStudentUser')

Route.get('/course-info/edit', 'StepsController.showStudentUser')

Route.get('/course-info/complete-course', 'StepsController.showStudentUser')

Route.get('/steps', 'StepsController.showStudentUser')

Route.get('/step/edit', 'StepsController.showStudentUser')

Route.get('/course-info/edit/supervised-student', 'StepsController.showStudentUser')

Route.group(() => {
  Route.get('/', 'PostsController.show')

  Route.get('/create', 'PostsController.showCreate')

  Route.get('/edit/:id', 'PostsController.showEdit')

  Route.get('/:id', 'PostsController.showById')
}).prefix('/announcement')

Route.group(() => {
  Route.post('/login', 'UsersController.verify').as('auth.login')
  // Route.post('/register', 'UsersController.register').as('auth.register')
  Route.get('/logout', 'UsersController.logout').as('auth.logout')
  Route.group(() => {
    Route.patch('/student/:id', 'StepsController.updateStudentUserStatus')
    Route.patch('/student/super/:id', 'CoursesInfoController.updateSupervisionStatus')
    Route.patch('/student/plan/:id', 'StepsController.updateStudentUserPlan')
    Route.patch('/student/info/:id', 'CoursesInfoController.updateStudentUserInfo')
    Route.patch('/student/regis/approve', 'CoursesInfoController.updateStudentUserApprove')
    Route.delete('/student/:id', 'UsersController.deleteStudentUser') //
    Route.patch('/courseInfo', 'CoursesInfoController.updateCourseInformation')
    Route.patch('/courseInfoUs', 'CoursesInfoController.updateUsersCourseInformation')
    Route.patch('/advisor/st', 'CoursesInfoController.updateAdvisorHasStudent')
    Route.get('/advisorUser', 'UsersController.showAdvisorUser')
    Route.get('/staffUser', 'UsersController.showStaffUser')
    Route.get('/staffCYear', 'UsersController.getStaffUserCuurentYear')
    Route.get('/advisorCYear', 'UsersController.getAdvisorUserCuurentYear')
    Route.get('/studentCYear', 'UsersController.getStudentUserCuurentYear')
    Route.get('/studentByAdv/:id', 'UsersController.getStudentUserByAdvisor')
    Route.delete('/delUserAc/:id', 'UsersController.delUsersInAcademicYear')
    Route.delete('/delUserAdv/:id', 'UsersController.delUsersFromAdvisor')
    // Route.patch('/supervision/:id', 'UsersController.updateSupervision')
  })
    // .middleware('login')
    .prefix('/user')

  Route.group(() => {
    Route.post('/', 'PostsController.store')
    Route.patch('/:id', 'PostsController.update')
    Route.delete('/:id', 'PostsController.remove')
    Route.get('/:id', 'PostsController.getById')
  })
    // .middleware('role')
    .prefix('/post')

  Route.get('/file', 'FilesController.showAllFile')
  Route.patch('/course/:id', 'CoursesInfoController.completeCourse')

  Route.group(() => {
    Route.post('/', 'FilesController.store')
    Route.post('/steps', 'FilesController.storeDirect')
    Route.get('/:fileId', 'FilesController.downloadFile')
    Route.delete('/:fileId', 'FilesController.deleteFileDirect')
  })
    // .middleware('login')
    .prefix('/file')
}).prefix('/api')
