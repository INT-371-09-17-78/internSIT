import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'
import Student from 'App/Models/Student'
import Status from 'App/Models/Status'
import File from 'App/Models/File'
import Document from 'App/Models/Document'
import Advisor from 'App/Models/Advisor'
import Document_Status from 'App/Models/DocumentStatus'
import AcademicYear from 'App/Models/AcademicYear'
import UserHasDoc from 'App/Models/UserHasDoc'
import UsersInAcademicYearModel from 'App/Models/UsersInAcademicYear'
// import UserHasDoc from 'App/Models/UserHasDoc'
// import Advisor from 'App/Models/Advisor'
// import Staff from 'App/Models/Staff'
import LdapAuth from 'ldapauth-fork'
import moment from 'moment-timezone'
import Mail from '@ioc:Adonis/Addons/Mail'
// import { DateTime } from 'luxon'

interface LdapOptions {
  url: string
  bindDN: string
  bindCredentials: string
  searchBase: string
  searchFilter: string
}

export default class UsersController {
  // public async index() {
  //   return await User.all()
  // }
  // public async store() {
  //   return await User.create({
  //     username: 'nuchanart.boo',
  //     password: 'Fxig08',
  //     email: 'nuchanart.boo',
  //   })
  // }
  // public async register({ request, response, session }: HttpContextContract) {
  //   try {
  //     let { userId, email } = request.all()
  //     const uniEmailFormat = '@mail.kmutt.ac.th'
  //     const regxEmail =
  //       /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  //     if (!email) throw new Error('empty email')
  //     if (email.includes(uniEmailFormat)) {
  //       if (!regxEmail.test(email)) {
  //         throw new Error('bad email format')
  //       }
  //     } else {
  //       email += uniEmailFormat
  //     }
  //     if (!userId) {
  //       throw new Error('empty userId')
  //     }
  //     if (userId.length < 11) {
  //       throw new Error('bad userId length')
  //     }
  //     let user: any
  //     let student: any
  //     user = await User.findBy('user_id', userId)

  //     const year = await AcademicYearConfig.query().orderBy('updated_at', 'desc')

  //     // if (!user) {
  //     //   year[0].related('users').create({
  //     //     user_id: userId,
  //     //     email: email,
  //     //   })
  //     // }

  //     if (!user) {
  //       user = new User()
  //       user.user_id = userId
  //       user.email = email
  //       user.conf_id = year[0]
  //       await user.save()
  //     }

  //     if (user && user.role === 'student') {
  //       student = await Student.findBy('student_id', userId)
  //       if (!student) {
  //         await user?.related('student').create({})
  //       }
  //     }

  //     await Mail.use('smtp').send((message) => {
  //       message
  //         .from('iunnuidev2@gmail.com')
  //         .to('iunnuidev2@gmail.com')
  //         .subject('test')
  //         .htmlView('emails/welcome', {
  //           user: { fullName: 'Some Name' },
  //           url: 'https://your-app.com/verification-url',
  //         })
  //     })

  //     return response.redirect('/success-regis')
  //   } catch (error) {
  //     session.flash({
  //       error: error.message,
  //       type: 'negative',
  //     })
  //     return response.redirect('/register')
  //   }
  // }

  public async verify({ auth, request, response, session }: HttpContextContract) {
    try {
      const { username, password, isRemember } = request.all()

      let rememberMe: boolean = isRemember && isRemember === 'yes' ? true : false
      let user: any
      user = await User.findBy('user_id', username)
      if (!user) {
        throw new Error('cannot find user')
      }

      let ldRole: string = user.role === 'advisor' || user.role === 'staff' ? 'staff' : 'st'

      const ldapUser: any = await this.authenticate(username, password, ldRole)
      const fullname = ldapUser.cn.split(' ')
      if (user && ldapUser && (!user.firstname || !user.lastname || !user.mail || !user.password)) {
        user.firstname = fullname[0]
        user.lastname = fullname[1]
        user.email = ldapUser.mail
        user.password = password
        await user.save()
      }

      await auth.attempt(username, password, rememberMe)
      return response.redirect('/announcement')
    } catch (error) {
      if (
        error.message === 'no password given' ||
        error.message === 'empty username' ||
        error.message === 'empty role'
      ) {
        session.flash({
          error: 'All fields are required',
          type: 'negative',
        })
      } else {
        session.flash({
          error: 'Invalid creditials',
          type: 'negative',
        })
      }
      return response.redirect('/')
    }
  }

  public async verify2({ auth, request, response, session }: HttpContextContract) {
    try {
      const { username, password, isRemember } = request.all()
      if (!username) {
        throw new Error('empty username')
      }
      // if (username.length < 11) {
      //   throw new Error('bad userName length')
      // }
      // const resultTest = await st?.related('documentsStatuses').create({
      //   // no_approve_reason: 'test',$
      // })
      let rememberMe: boolean = isRemember && isRemember === 'yes' ? true : false
      let user: any
      user = await User.findBy('user_id', username)
      const years = await AcademicYear.query().orderBy('updated_at', 'desc')
      const checkExist = await UsersInAcademicYearModel.query()
        .where('academic_year', years[0].academic_year)
        .andWhere('user_id', username)
      // const checkExist = await years[0].related('users').query()
      // console.log(checkExist)
      if (user && user.role === 'admin') {
        if (!checkExist || checkExist.length <= 0) {
          await years[0].related('users').attach({ [user.user_id]: { approved: true } })
        }
        await auth.attempt(username, password, rememberMe)
        return response.redirect('/course-info/edit')
      } else if (user && user.role === 'student' && checkExist && checkExist.length > 0) {
        const st = await Student.findBy('student_id', user.user_id)
        if (!st) {
          await user?.related('student').create({})
        }
        if (checkExist[0].approved) {
          await auth.attempt(username, password, rememberMe)
          return response.redirect(`/student/${user.user_id}`) //student ที่ approved แล้ว
        } else {
          return response.redirect('/success-regis') //student ที่ยังไม่ approved
        }
        // }
      } else if (user && user.role !== 'student') {
        if (!checkExist || checkExist.length <= 0) {
          throw new Error('no privacy in this academic_year')
        } else {
          await auth.attempt(username, password, rememberMe) //staff เข้าได้เลยรึปะ
          if (years && years.length > 0) {
            return response.redirect('/student-information')
          }
          return response.redirect('/course-info/edit')
        }
      } else {
        const ldapUser: any = await this.authenticate(username, password, 'st') //student ที่ยังไม่มีข้อมูลใน db
        const fullname = ldapUser.cn.split(' ')
        if (ldapUser) {
          const year = await AcademicYear.query().orderBy('updated_at', 'desc')
          //   .preload('users')
          // console.log(year[0].users)
          if (user) {
            await year[0].related('users').attach([user.user_id])
          } else {
            await year[0].related('users').create({
              user_id: username,
              firstname: fullname[0],
              lastname: fullname[1],
              email: ldapUser.mail,
              password: password,
            })
          }

          // user = new User()
          // user.user_id = username
          // user.firstname = fullname[0]
          // user.lastname = fullname[1]
          // user.email = ldapUser.mail
          // user.password = password
          // await user.save()
          const lastestUsers = await User.find(username)
          const st = await Student.findBy('student_id', username)
          if (!st && lastestUsers) {
            await lastestUsers.related('student').create({})
          }
          await Mail.use('smtp').send((message) => {
            message
              .from('iunnuidev2@gmail.com')
              .to('iunnuidev2@gmail.com')
              .subject('test')
              .htmlView('emails/welcome', {
                user: { fullName: 'Some Name' },
                url: 'https://your-app.com/verification-url',
              })
          })
        }
        return response.redirect('/success-regis')
      }
    } catch (error) {
      console.log(error)
      if (
        error.message === 'no password given' ||
        error.message === 'empty username'
        // error.message === 'empty role'
      ) {
        session.flash({
          error: 'All fields are required',
          type: 'negative',
        })
      } else if (error.message === 'no privacy in this academic_year') {
        session.flash({
          error: 'No Privacy In This Academic Year',
          type: 'negative',
        })
      } else {
        session.flash({
          error: 'Invalid creditials',
          type: 'negative',
        })
      }
      return response.redirect('/')
    }
  }

  public authenticate(username: string, password: string, role: string) {
    return new Promise((resolve, reject) => {
      const options: LdapOptions = {
        url: 'ldaps://ld0620.sit.kmutt.ac.th',
        bindDN: 'uid=' + username + ',ou=People,ou=' + role + ',dc=sit,dc=kmutt,dc=ac,dc=th',
        bindCredentials: password,
        searchBase: 'ou=People,ou=' + role + ',dc=sit,dc=kmutt,dc=ac,dc=th',
        searchFilter: 'uid={{username}}',
      }
      const client = new LdapAuth(options)
      client.authenticate(username, password, (error, user) => {
        if (error) {
          reject(error)
        }
        resolve(user)
      })
    })
  }

  public async logout({ response, auth }: HttpContextContract) {
    await auth.logout()
    return response.redirect('/')
  }

  public async showStudentUser({ request, response, view }: HttpContextContract) {
    try {
      // console.log(request.cookie('year'))
      const AcademicYearAll = await AcademicYear.query().orderBy('updated_at', 'desc')
      const AcademicYearCf = await AcademicYear.query().where(
        'academic_year',
        request.cookie('year')
      )
      let studentUsers: any = []
      let result: any = []
      let advisorUsersResult: any = []
      let staffUsersResult: any = []
      // let year: any
      let allAmoutSt: any
      let noApprove: any

      // if (Object.keys(request.qs()).length <= 0 && request.matchesRoute('/student-information')) {
      //   console.log('asdasd')

      //   return view.render('errors/not-found')
      // }

      // if (request.qs().year) {
      //   const result = await AcademicYear.findBy('academic_year', request.qs().year)
      //   year = result?.academic_year
      // }

      // stafftUsers = await User.query().where('role', 'staff')
      // advisorUsers = await User.query().where('role', 'advisor')
      // const advisorUsersJSON = advisorUsers.map((post) => post.serialize())
      // console.log(advisorUsersJSON)
      if (AcademicYearCf && AcademicYearCf.length > 0) {
        const UsersInAcademicYear = await UsersInAcademicYearModel.query().where(
          'academic_year',
          AcademicYearCf[0].academic_year
        )
        for (let i = 0; i < UsersInAcademicYear.length; i++) {
          const result = await User.query()
            .where('role', 'student')
            .andWhere('user_id', UsersInAcademicYear[i].user_id)
            .preload('student')
          if (result[0]) {
            const resultSe = result[0].serialize()
            resultSe['approved'] = UsersInAcademicYear[i].approved
            // console.log(resultSe)
            studentUsers.push(resultSe)
          }
        }
        // console.log(studentUsers)
        // console.log(studentUsers)
        allAmoutSt = studentUsers.length
        // console.log(studentUsers)

        noApprove = studentUsers.filter((st) => !st.approved)
        if (request.qs().month) {
          studentUsers = studentUsers.filter(
            (userPre) => userPre.student.plan === parseInt(request.qs().month)
          )
          console.log(studentUsers)
          // studentUsers = studentUsers.map((st) => st.serialize())
        }

        const advisorUsers = await User.query().where('role', 'advisor')
        const staffUsers = await User.query().where('role', 'staff')
        for (let i = 0; i < advisorUsers.length; i++) {
          const check = await UsersInAcademicYearModel.query()
            .where('user_id', advisorUsers[i].user_id)
            .andWhere('academic_year', AcademicYearAll[0].academic_year)
          if (check && check.length > 0) {
            advisorUsersResult.push(check[0])
          }
        }
        for (let i = 0; i < staffUsers.length; i++) {
          const check = await UsersInAcademicYearModel.query()
            .where('user_id', staffUsers[i].user_id)
            .andWhere('academic_year', AcademicYearAll[0].academic_year)
          if (check && check.length > 0) {
            staffUsersResult.push(check[0])
          }
        }
      } else {
        studentUsers = []
      }
      // console.log(advisorUsersResult)
      // console.log(studentUsers.length)
      if (studentUsers && studentUsers.length > 0) {
        for (let i = 0; i < studentUsers.length; i++) {
          // const documentStatuses = await studentUsers[i].student
          //   .related('documentsStatuses')
          //   .query()
          //   .orderBy('pivot_updated_at', 'desc')
          // if (documentStatuses && documentStatuses.length > 0) {
          //   studentUsers[i].serialize()
          //   if (documentStatuses[0].status_id === 'Waiting') {
          //     studentUsers[i]['lastestStatus'] =
          //       documentStatuses[0].status_id + ' for ' + documentStatuses[0].document_id
          //   } else {
          //     studentUsers[i]['lastestStatus'] =
          //       documentStatuses[0].document_id + ' ' + documentStatuses[0].status_id
          //   }
          // } else {
          //   studentUsers[i].serialize()
          //   studentUsers[i]['lastestStatus'] = `Waiting for TR-01`
          // }
          const usersInAcademicYear = await UsersInAcademicYearModel.query()
            .where('user_id', studentUsers[i].user_id)
            .andWhere('academic_year', AcademicYearCf[0].academic_year)
          const userHasDoc = await usersInAcademicYear[0].related('documentStatus').query()
          // console.log(userHasDoc)
          if (userHasDoc && userHasDoc.length > 0) {
            // studentUsers[i].serialize()
            if (userHasDoc[0].status_id === 'Waiting') {
              studentUsers[i]['lastestStatus'] =
                userHasDoc[0].status_id + ' for ' + userHasDoc[0].document_id
            } else {
              studentUsers[i]['lastestStatus'] =
                userHasDoc[0].document_id + ' ' + userHasDoc[0].status_id
            }
          } else {
            // studentUsers[i].serialize()
            studentUsers[i]['lastestStatus'] = `Waiting for TR-01`
          }
          // await UserHasDoc.query().where
          // for(let i =0;i< usersInAcademicYear.length;i++){

          // }
          // console.log(usersInAcademicYear)
          // await UserHasDoc.query().where('user_in_academic_year_id')
          // const await DocumentStatus[0].related('usersInAcademicYear').query()
        }

        if (request.qs().status && request.qs().step) {
          const resultPre = this.queryStringFilter(studentUsers, request.qs().status)
          result = this.queryStringFilter(resultPre, request.qs().step)
        } else if (request.qs().status) {
          result = this.queryStringFilter(studentUsers, request.qs().status)
        } else if (request.qs().step) {
          result = this.queryStringFilter(studentUsers, request.qs().step)
        }
      }
      // response.cookie('year', year)
      return view.render('student-information', {
        studentUsers:
          (studentUsers && studentUsers.length > 0 && request.qs().status) || request.qs().step
            ? result
            : studentUsers,
        advisorUsers: advisorUsersResult,
        stafftUsers: staffUsersResult,
        noApprove: noApprove ? noApprove.length : 0,
        allAmoutSt: allAmoutSt,
        academicYears: AcademicYearAll,
      })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async updateCourseInformation({ request, response }: HttpContextContract) {
    try {
      const { year, isCurrent } = request.all()
      let AcademicYearCfResult: any = []
      if (isCurrent) {
        AcademicYearCfResult = await AcademicYear.query()
          .where('academic_year', year)
          .orderBy('updated_at', 'desc')
        let AcademicYearCf: any
        if (!AcademicYearCfResult || AcademicYearCfResult.length === 0 || !year) {
          AcademicYearCf = new AcademicYear()
          AcademicYearCf.academic_year = year
          await AcademicYearCf.save()
        }
      }
      // else {
      response.cookie('year', year)
      // }
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async updateUsersCourseInformation({ request, response }: HttpContextContract) {
    try {
      const { users } = request.all()
      console.log(users)
      let AcademicYearCfResult: any
      // let usersArr: any = []
      AcademicYearCfResult = await AcademicYear.query().orderBy('updated_at', 'desc')

      if (
        (users.advisors && users.advisors.length > 0) ||
        (users.staffs && users.staffs.length > 0)
      ) {
        const newUser = users.advisors.concat(users.staffs)

        for (let i = 0; i < newUser.length; i++) {
          const user = await User.find(newUser[i])
          if (user) {
            await AcademicYearCfResult[0]
              .related('users')
              .attach({ [user.user_id]: { approved: true } })
            // user.conf_id = AcademicYearCf ? AcademicYearCf.conf_id : AcademicYearCfResult[0].conf_id
            // usersArr.push(user)
          }
        }

        // await AcademicYearCfResult[0].related('users').saveMany(usersArr)
      }
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  // public async updateUserApproveInCourse({ request, response }: HttpContextContract) {
  //   try {
  //     const { users } = request.only(['users'])
  //     users.forEach(async (user) => {
  //       const studentUsers = await User.query().where('user_id', user.id).preload('student')
  //       const studentUser = studentUsers[0]
  //       studentUser.approved = user.approve
  //       await studentUser.save()
  //     })
  //     // if (approve) {
  //     //   response.redirect(`/students/request`)
  //     // } else {
  //     //   response.redirect(`/student/${studentUser.user_id}/information`)
  //     // }
  //     // response.status(200).send('success')
  //     response.redirect(`/course-management`)
  //   } catch (error) {
  //     return response.status(400).json({ message: error.message })
  //   }
  // }

  public async showAdvisorUser({ response }: HttpContextContract) {
    try {
      let advisorUsers: any
      const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      // console.log(AcademicYearCf[0].conf_id)
      if (AcademicYearCf && AcademicYearCf.length > 0) {
        advisorUsers = await User.query().where('role', 'advisor')
        // .andWhere('conf_id', AcademicYearCf[0].conf_id)
        if (!advisorUsers || advisorUsers.length <= 0) {
          advisorUsers = await User.query().where('role', 'advisor')
        }
      } else {
        advisorUsers = await User.query().where('role', 'advisor')
        // .andWhere('conf_id', AcademicYearCf[0].conf_id)
      }
      // console.log(advisorUsers)
      return response.status(200).json({ advisorUsers: advisorUsers })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async showStaffUser({ response }: HttpContextContract) {
    try {
      let staffUsers: any
      const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      if (AcademicYearCf && AcademicYearCf.length > 0) {
        staffUsers = await User.query().where('role', 'staff')
        // .andWhere('conf_id', AcademicYearCf[0].conf_id)
        if (!staffUsers || staffUsers.length <= 0) {
          staffUsers = await User.query().where('role', 'staff')
        }
      } else {
        staffUsers = await User.query().where('role', 'staff')
        // .andWhere('conf_id', AcademicYearCf[0].conf_id)
      }

      return response.status(200).json({ staffUsers: staffUsers })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async showStaffUserCuurentYear({ response }: HttpContextContract) {
    try {
      let staffUsers: any = []
      const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      const users = await User.query().where('role', 'staff')
      for (let i = 0; i < users.length; i++) {
        const result = await UsersInAcademicYearModel.query()
          .where('user_id', users[i].user_id)
          .andWhere('academic_year', AcademicYearCf[0].academic_year)
        if (result && result.length > 0) {
          staffUsers.push(result[0])
        }
      }
      // await UsersInAcademicYearModel.query().where()

      return response.status(200).json({ staffUsers: staffUsers })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async showAdvisorUserCuurentYear({ response }: HttpContextContract) {
    try {
      let advisorUsers: any = []
      const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      const users = await User.query().where('role', 'advisor')
      for (let i = 0; i < users.length; i++) {
        const result = await UsersInAcademicYearModel.query()
          .where('user_id', users[i].user_id)
          .andWhere('academic_year', AcademicYearCf[0].academic_year)
        if (result && result.length > 0) {
          advisorUsers.push(result[0])
        }
      }
      // await UsersInAcademicYearModel.query().where()

      return response.status(200).json({ advisorUsers: advisorUsers })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  private queryStringFilter(arr, queryString) {
    const result = arr.filter((word) => {
      if (Array.isArray(queryString)) {
        for (const qs of queryString) {
          if (word['lastestStatus'].toUpperCase().includes(qs.toUpperCase())) {
            return true
          }
        }
        return false
      } else {
        if (word['lastestStatus'].toUpperCase().includes(queryString.toUpperCase())) {
          return true
        }
        return false
      }
    })
    return result
  }

  public async showStudentUserById({ auth, request, response, view }: HttpContextContract) {
    try {
      // const role = request.param('role')
      // const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      // const AcademicYearAll = await AcademicYear.query().orderBy('updated_at', 'desc')
      // console.log(auth.user)
      let AcademicYearCf: any
      if (auth.user?.role === 'student') {
        AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      } else {
        AcademicYearCf = await AcademicYear.query().where('academic_year', request.cookie('year'))
      }

      const studentUsers = await User.query()
        .where('role', 'student')
        .andWhere('user_id', request.param('id'))
        .preload('student')
      const studentUser = studentUsers[0]
      // return response.status(200).json(studentUser)
      // const { lastStepPaging, gnext } = request.only(['lastStepPaging', 'gnext'])
      const qs = request.qs()
      const plans = [2, 4, 6]
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
      let steps: any =
        studentUser.student.plan === 6
          ? [
              {
                name: 'TR-01',
              },
              {
                name: 'TR-02',
              },
              {
                name: 'TR-03 and TR-05 (1/6)',
              },
              {
                name: 'Informed supervision (1/6)',
              },
              {
                name: 'TR-03 and TR-05 (2/6)',
              },
              {
                name: 'Informed supervision (2/6)',
              },
              {
                name: 'TR-03 and TR-05 (3/6)',
              },
              {
                name: 'Informed supervision (3/6)',
              },
              {
                name: 'TR-03 and TR-05 (4/6)',
              },
              {
                name: 'Informed supervision (4/6)',
              },
              {
                name: 'TR-03 and TR-05 (5/6)',
              },
              {
                name: 'Informed supervision (5/6)',
              },
              {
                name: 'Sent Presentation',
              },
              {
                name: 'Presentation',
              },
              {
                name: 'TR-03 and TR-06 (6/6)',
              },
            ]
          : studentUser.student.plan === 4
          ? [
              {
                name: 'TR-01',
                status: 'Approved',
              },
              {
                name: 'TR-02',
                status: 'Approved',
              },
              {
                name: 'TR-03 and TR-05 (1/4)',
                status: 'Approved',
              },
              {
                name: 'Informed supervision (1/4)',
                status: '',
              },
              {
                name: 'TR-03 and TR-05 (2/4)',
                status: '',
              },
              {
                name: 'Informed supervision (2/4)',
              },
              {
                name: 'TR-03 and TR-05 (3/4)',
              },
              {
                name: 'Informed supervision (3/4)',
              },
              {
                name: 'Sent Presentation',
              },
              {
                name: 'Presentation',
              },
              {
                name: 'TR-03 and TR-06 (4/4)',
              },
            ]
          : [
              {
                name: 'TR-01',
              },
              {
                name: 'TR-02',
              },
              {
                name: 'Informed supervision',
              },
              {
                name: 'Informed presentation day',
              },
              {
                name: 'Presentation',
              },
              {
                name: 'Sent Presentation',
              },
              {
                name: 'TR-03 and TR-08',
              },
            ]
      let nextStep: any
      let currentSteps: any = {}
      const disabled = studentUser.student.plan === null ? '' : 'disabled'
      // const student = await Student.findOrFail(request.param('id'))

      // const documentStatuses = await student
      //   .related('documentsStatuses')
      //   .query()
      //   .wherePivot('student_id', request.param('id'))
      //   .orderBy('pivot_updated_at', 'desc')

      const usersInAcademicYear = await UsersInAcademicYearModel.query()
        .where('user_id', studentUser.user_id)
        .andWhere('academic_year', AcademicYearCf[0].academic_year)
      const userHasDocResult = await UserHasDoc.query()
        .where('user_in_academic_year_id', usersInAcademicYear[0].id)
        // .andWhere('user_in_academic_year_id', usersInAcademicYear[0].id)
        .orderBy('updated_at', 'desc')
      // const userHasDoc = await usersInAcademicYear[0]
      //   .related('documentStatus')
      //   .query()
      //   .where('id', UserHasDocResult[0].doc_stat_id)

      let userHasDoc
      if (userHasDocResult[0])
        userHasDoc = await Document_Status.query().where('id', userHasDocResult[0].doc_stat_id)
      // console.log(userHasDocResult[0])
      // userHasDocResult[0].related('')
      if (userHasDoc && userHasDoc.length > 0) {
        const documentStatusesJsonCurrent = userHasDoc[0].toJSON()
        currentSteps['name'] = documentStatusesJsonCurrent.document_id
        currentSteps['status'] = documentStatusesJsonCurrent.status_id
        currentSteps['createAt'] = moment(documentStatusesJsonCurrent.created_at.toString())
          .tz('Asia/Bangkok')
          .format('MMMM D, YYYY h:mm A')
        currentSteps['reason'] = userHasDocResult[0].$extras.no_approve_reason

        const stepIndex = steps.findIndex((word) => word.name === currentSteps['name'])
        if (stepIndex >= 0) {
          if (userHasDoc[0].status_id === 'Approved') {
            nextStep = steps[stepIndex + 1]
          } else {
            nextStep = steps[stepIndex]
          }
        }
        let index: any
        for (let i = 0; i < steps.length; i++) {
          for (let j = 0; j < userHasDoc.length; j++) {
            if (steps[i].name === userHasDoc[j].document_id) {
              // steps[0]['status'] = 'Approved'
              index = i

              steps[i]['status'] = userHasDoc[j].status_id
              break
            } else {
              steps[i]['status'] = ''
            }
          }
        }

        for (let i = 0; i < index; i++) {
          steps[i]['status'] = 'Approved'
        }
      } else {
        currentSteps['name'] = steps[0].name
        currentSteps['status'] = ''
        currentSteps['createAt'] = ''
        currentSteps['reason'] = ''
        nextStep = steps[0]
        // nextStep['status'] = 'Waiting'
      }
      console.log(steps)
      console.log(currentSteps)
      console.log(nextStep)

      let stepPaged = []
      if (qs.firstStepPaging) {
        const firstStepPagingIndex = steps.findIndex((step) => step.name === qs.firstStepPaging)
        stepPaged =
          qs.gnext === 'true'
            ? steps.slice(firstStepPagingIndex + 4, firstStepPagingIndex + 8)
            : steps.slice(firstStepPagingIndex - 4, firstStepPagingIndex)
      } else {
        stepPaged = steps.slice(0, 4)
      }
      const lastOfAllStep = steps[steps.length - 1].name
      const firstOfAllStep = steps[0].name
      return view.render('student', {
        studentUser,
        plans,
        disabled,
        nextStep,
        currentSteps,
        stepPaged,
        firstOfAllStep,
        lastOfAllStep,
        studentInfo,
        // userHasDoc: userHasDoc[0].id,
      })
      // return response.redirect('/announcement')
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async updateStudentUserStatus({ request, response }: HttpContextContract) {
    try {
      const { study, status, doc, reason } = request.only(['study', 'status', 'doc', 'reason'])
      const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      const studentUser = await Student.findOrFail(request.param('id'))
      const usersInAcademicYear = await UsersInAcademicYearModel.query()
        .where('user_id', studentUser.student_id)
        .andWhere('academic_year', AcademicYearCf[0].academic_year)
      let statusResult: Status
      let docResult: Document
      if (study) {
        studentUser.plan = study
        await studentUser.save()

        // await studentUser
        //   .related('documentsStatuses')
        //   .query()
        //   .wherePivot('student_id', studentUser.student_id)
        //   .delete()
        const userHasDoc = await usersInAcademicYear[0].related('documentStatus').query()
        // console.log(userHasDoc[0])
        if (userHasDoc[0]) {
          await File.query().where('user_has_doc_id', userHasDoc[0].id).delete()
        }
        await usersInAcademicYear[0].related('documentStatus').query().delete()
      }
      // if (status && doc) {
      statusResult = await Status.findOrFail(status || 'Waiting')
      docResult = await Document.findOrFail(doc || 'TR-01')

      const docStat = await Document_Status.query()
        .where('status_id', statusResult.status_name)
        .andWhere('document_id', docResult.doc_name)
        .orderBy('updated_at', 'desc')
      // await studentUser.related('document_status').updateOrCreate(
      //   { student_id: studentUser.student_id },
      //   {
      //     document_id: docResult.doc_name,
      //     status_id: statusResult.status_name,
      //   }
      // )
      // console.log();

      if (docStat && docStat.length > 0) {
        // const st = await studentUser
        //   .related('documentsStatuses')
        //   .query()
        //   .wherePivot('student_id', studentUser.student_id)
        //   .andWherePivot('doc_stat_id', docStat[0].id)
        //   .orderBy('pivot_updated_at', 'desc')
        //   .preload('students')
        // console.log(st[0].$extras.pivot_doc_stat_id)
        // console.log(docStat[0].id)
        // st[0].$extras.pivot_doc_stat_id = docStat[0].id
        // await st[0].save()
        // if (st && st.length > 0) {
        // }
        await usersInAcademicYear[0].related('documentStatus').attach({
          [docStat[0].id]: {
            no_approve_reason:
              reason && reason !== '' && statusResult.status_name === 'Disapproved' ? reason : null,
          },
        })
        // await studentUser.related('documentsStatuses').attach({
        //   [docStat[0].id]: {
        //     no_approve_reason:
        //       reason && reason !== '' && statusResult.status_name === 'Disapproved' ? reason : null,
        //   },
        // })
        // await studentUser.related('documentsStatuses').attach([docStat[0].id])
      }
      // if (docStat && docStat.length > 0) {
      //   await studentUser
      //     .related('documentsStatuses')
      //     .query()
      //     .where('student_id', docStat[0].id)
      //     .update({
      //       doc_stat_id: statusResult.status_name,
      //       no_approve_reason:
      //         reason && reason !== '' && statusResult.status_name === 'Disapproved' ? reason : null,
      //     })
      // } else {
      // await studentUser.related('document_status').create({
      //   student_id: studentUser.student_id,
      //   document_id: docResult.doc_name,
      //   status_id: statusResult.status_name,
      //   // no_approve_reason:
      //   //   reason && reason !== '' && statusResult.status_name === 'Not Approve' ? reason : null,
      // })
      // }
      // }

      response.redirect('/student/' + studentUser.student_id)
      // return response.status(200).json(result)
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async updateStudentUserApprove({ request, response }: HttpContextContract) {
    try {
      const { users } = request.only(['users'])
      users.forEach(async (user) => {
        // const studentUsers = await User.query().where('user_id', user.id).preload('student')
        // const studentUser = studentUsers[0]
        // studentUser.approved = user.approve
        // await studentUser.save()

        const years = await AcademicYear.query().orderBy('updated_at', 'desc')
        const UsersInAcademicYear = await UsersInAcademicYearModel.query()
          .where('academic_year', years[0].academic_year)
          .andWhere('user_id', user.id)
        UsersInAcademicYear[0].approved = user.approve
        await UsersInAcademicYear[0].save()
      })
      // if (approve) {
      //   response.redirect(`/students/request`)
      // } else {
      //   response.redirect(`/student/${studentUser.user_id}/information`)
      // }
      // response.status(200).send('success')
      response.redirect(`/student-information`)
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async deleteStudentUser({ request, response }: HttpContextContract) {
    try {
      // const { user } = request.only(['user'])
      const user = await User.find(request.param('id'))
      if (user) {
        user.delete()
      } else {
        throw Error('cannot find user')
      }
      response.status(200).send('success')
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async updateStudentUserInfo({ request, response }: HttpContextContract) {
    try {
      const {
        firm,
        email,
        tel,
        department,
        position,
        duration,
        mentor,
        mentorPosition,
        mentorEmail,
        mentorTel,
        advisorFullName,
        // approve,
      } = request.only([
        'firm',
        'email',
        'tel',
        'department',
        'position',
        'duration',
        'mentor',
        'mentorPosition',
        'mentorEmail',
        'mentorTel',
        'advisorFullName',
        // 'approve',
      ])
      const studentUsers = await User.query()
        .where('user_id', request.param('id'))
        .preload('student')
      const studentUser = studentUsers[0]
      // const studentUser = await Student.findOrFail(request.param('id'))
      studentUser.student.firm = firm
      studentUser.student.tel = tel
      studentUser.student.department = department
      studentUser.student.position = position
      studentUser.student.plan = duration
      studentUser.student.mentor_name = mentor
      studentUser.student.mentor_position = mentorPosition
      studentUser.student.mentor_email = mentorEmail
      studentUser.student.mentor_tel_no = mentorTel
      studentUser.email = email
      // studentUser.approved = approve
      // if (email) {
      //   const studentUser = await User.query()
      //     .where('user_id', request.param('id'))
      //     .preload('student')
      //   studentUser[0].email = email
      //   await studentUser[0].save()
      // }
      if (advisorFullName) {
        const advisorFullNameSplit = advisorFullName.split(' ')
        if (advisorFullNameSplit && advisorFullNameSplit.length > 1) {
          const roleAdvisorUser = await User.query()
            .where('firstName', advisorFullNameSplit[0])
            .andWhere('lastName', advisorFullNameSplit[1])
            .andWhere('role', 'advisor')
          if (roleAdvisorUser && roleAdvisorUser.length > 0) {
            const advisorUsers = await Advisor.query().where(
              'advisor_id',
              roleAdvisorUser[0].user_id
            )
            studentUser.student.advisor_id = advisorUsers[0].advisor_id
            // advisorUsers[0].related('students').updateOrCreate({

            // })
            // studentUser.student.advisor_id = advisorUser[0].user_id
            // advisorUser[0].related('student')
          }
        }
      }

      await studentUser.save()
      await studentUser.student.save()
      // if (approve) {
      //   response.redirect(`/register-request`)
      // } else {
      response.redirect(`/student/${studentUser.user_id}/information`)
      // }
      // response.redirect(`/student/${studentUser.user_id}/information`)
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async showStudentInfo({ request, response, view }: HttpContextContract) {
    try {
      const studentUsers = await User.query()
        .where('role', 'student')
        .andWhere('user_id', request.param('id'))
        .preload('student')
      const studentUser = studentUsers[0]
      if (studentUser.student.advisor_id) {
        const advisor = await User.findOrFail(studentUser.student.advisor_id)
        studentUser.student['advisorFullName'] = advisor.firstname + ' ' + advisor.lastname
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
          value: studentUser.student['advisorFullName']
            ? studentUser.student['advisorFullName']
            : '',
          key: 'advisorFullName',
        },
      ]
      return view.render('student-info', {
        studentUser,
        disabled,
        studentInfo,
      })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async showStudentInfoEdit({ request, response, view }: HttpContextContract) {
    try {
      const studentUsers = await User.query()
        .where('role', 'student')
        .andWhere('user_id', request.param('id'))
        .preload('student')
      const studentUser = studentUsers[0]
      if (studentUser.student.advisor_id) {
        const advisor = await User.findOrFail(studentUser.student.advisor_id)
        studentUser.student['advisorFullName'] = advisor.firstname + ' ' + advisor.lastname
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
          value: studentUser.student['advisorFullName']
            ? studentUser.student['advisorFullName']
            : '',
          key: 'advisorFullName',
        },
      ]
      // request.qs().editing && request.qs().editing !== '' ? (editing = true) : (editing = false)
      return view.render('edit-student', { studentUser, disabled, studentInfo })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async gen() {
    try {
      let resultDocs: any
      let resultStatuses: any
      let year: any
      const docs = await Document.all()
      if (docs && docs.length === 0) {
        resultDocs = await Document.createMany([
          // {
          //   doc_name: 'Resume, portfolio',
          // },
          {
            doc_name: 'TR-01',
          },
          {
            doc_name: 'TR-02',
          },
          {
            doc_name: 'TR-03 and TR-05 (1/6)',
          },
          {
            doc_name: 'Informed supervision (1/6)',
          },
          {
            doc_name: 'TR-03 and TR-05 (2/6)',
          },
          {
            doc_name: 'Informed supervision (2/6)',
          },
          {
            doc_name: 'TR-03 and TR-05 (3/6)',
          },
          {
            doc_name: 'Informed supervision (3/6)',
          },
          {
            doc_name: 'TR-03 and TR-05 (4/6)',
          },
          {
            doc_name: 'Informed supervision (4/6)',
          },
          {
            doc_name: 'TR-03 and TR-05 (5/6)',
          },
          {
            doc_name: 'Informed supervision (5/6)',
          },
          {
            doc_name: 'Sent Presentation',
          },
          {
            doc_name: 'Presentation',
          },
          {
            doc_name: 'TR-03 and TR-06 (6/6)',
          },
          {
            doc_name: 'TR-03 and TR-05 (1/4)',
          },
          {
            doc_name: 'Informed supervision (1/4)',
          },
          {
            doc_name: 'TR-03 and TR-05 (2/4)',
          },
          {
            doc_name: 'Informed supervision (2/4)',
          },
          {
            doc_name: 'TR-03 and TR-05 (3/4)',
          },
          {
            doc_name: 'Informed supervision (3/4)',
          },
          {
            doc_name: 'TR-03 and TR-06 (4/4)',
          },
          {
            doc_name: 'Informed supervision',
          },
          {
            doc_name: 'Informed presentation day',
          },
          {
            doc_name: 'TR-03 and TR-08',
          },
        ])
      }
      const statuses = await Status.all()
      if (statuses && statuses.length === 0) {
        resultStatuses = await Status.createMany([
          {
            status_name: 'Pending',
          },
          {
            status_name: 'Disapproved',
          },
          {
            status_name: 'Approved',
          },
          {
            status_name: 'Waiting',
          },
        ])
      }
      const users = await User.all()
      if (users && users.length === 0) {
        const currentYear = await AcademicYear.query().orderBy('updated_at', 'desc')
        if (!currentYear || currentYear.length === 0) {
          year = await AcademicYear.create({
            academic_year: new Date().getFullYear(),
          })
        } else {
          year = currentYear[0]
        }
        // year = await AcademicYear.create({
        //   academic_year: new Date().getFullYear(),
        // })
        //   .preload('users')
        // console.log(year[0].users)
        // if (user) {
        //   await year[0].related('users').attach([user.user_id])
        // } else {
        //   await year[0].related('users').create({
        //     user_id: username,
        //     firstname: fullname[0],
        //     lastname: fullname[1],
        //     email: ldapUser.mail,
        //     password: password,
        //   })
        // }
        const arr = [
          {
            user_id: 'nuchanart.boo',
            firstname: 'Saowatharn',
            lastname: 'Suparat',
            role: 'staff',
            password: 'Fxig08',
            // approved: true,
          },
          {
            user_id: 'sirinthip.suk',
            firstname: 'Theetika',
            lastname: 'Yuvaves',
            role: 'staff',
            password: 'Fxig08',
            // approved: true,
          },
          {
            user_id: 'krant.bur',
            firstname: 'Kantsak',
            lastname: 'Sivaraksa',
            role: 'admin',
            password: 'Fxig08',
            // approved: true,
          },
          {
            user_id: 'manee.mun',
            firstname: 'Karn',
            lastname: 'Dahkling',
            role: 'advisor',
            password: 'Fxig08',
            // approved: true,
          },
          {
            user_id: 'piti.ket',
            firstname: 'Tinnakit',
            lastname: 'Kulawanit',
            role: 'advisor',
            password: 'Fxig08',
            // approved: true,
          },
        ]
        const usersArr = await User.createMany(arr)
        usersArr.forEach(
          async (user) =>
            user.role === 'staff'
              ? await user.related('staff').create({})
              : // ,
                // await year.related('users').attach([user.user_id]))
                await user.related('advisor').create({})
          // ,
          // await year.related('users').attach([user.user_id]))
        )
      }
      const docsStatuses = await Document_Status.all()
      if (
        docsStatuses &&
        docsStatuses.length === 0 &&
        resultDocs &&
        resultDocs.length >= 1 &&
        resultStatuses &&
        resultStatuses.length >= 1
      ) {
        for (let doc of resultDocs) {
          for (let status of resultStatuses) {
            await Document_Status.createMany([
              {
                document_id: doc.doc_name,
                status_id: status.status_name,
              },
            ])
          }
        }
      }
      return year
    } catch (error) {
      console.log(error)
    }
  }
}
