import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'
import Student from 'App/Models/Student'
// import Status from 'App/Models/Status'
import File from 'App/Models/File'
import { StepStatus, Steps4Month, Steps2Month, Steps6Month, AllSteps } from 'Contracts/enum'
// import Document from 'App/Models/Document'
// import StepStatusModel from 'App/Models/StepStatus'
import AcademicYear from 'App/Models/AcademicYear'
import UserHasDoc from 'App/Models/UserHasDoc'
import UsersInAcademicYearModel from 'App/Models/UsersInAcademicYear'
// import UserHasDoc from 'App/Models/UserHasDoc'
// import Advisor from 'App/Models/Advisor'
// import Staff from 'App/Models/Staff'
import LdapAuth from 'ldapauth-fork'
import moment from 'moment-timezone'
import Mail from '@ioc:Adonis/Addons/Mail'

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
        const st = await Student.findBy('student_id', checkExist[0].id)
        if (!st) {
          await checkExist[0]?.related('student').create({})
        }
        if (checkExist[0].approved) {
          await auth.attempt(username, password, rememberMe)
          return response.redirect(`/student-information/${user.user_id}`) //student ที่ approved แล้ว
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
          const lastestUsers = await UsersInAcademicYearModel.query()
            .where('user_id', username)
            .andWhere('academic_year', year[0].academic_year)
          const st = await Student.findBy('student_id', username)
          if (st) {
            st.plan = 0
            await st.save()
          }
          if (!st && lastestUsers && lastestUsers.length > 0) {
            await lastestUsers[0].related('student').create({})
            // await UsersInAcademicYearModel.create({
            //   academic_year: year[0].academic_year,
            //   user_id: lastestUsers.user_id,
            // })
          }
          await Mail.use('smtp').send((message) => {
            message
              .from('iunnuidev2@gmail.com')
              .to('iunnuidev2@gmail.com')
              .subject('Registration Success')
              .htmlView('emails/welcome')
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
          error: 'No Permission In This Academic Year',
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
      const AcademicYearAll = await AcademicYear.query().orderBy('updated_at', 'desc')

      let AcademicYearCf: any

      if (request.cookie('year')) {
        AcademicYearCf = await AcademicYear.query().where('academic_year', request.cookie('year'))
      } else {
        AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      }
      let studentUsers: any = []
      let result: any = []
      let advisorUsersResult: any = []
      let staffUsersResult: any = []
      // let year: any
      let allAmoutSt: any
      let noApprove: any
      let advisorById: any = []
      let studentUsersByAdOne: any
      // if (Object.keys(request.qs()).length <= 0 && request.matchesRoute('/student-information')) {
      //   console.log('asdasd')

      //   return view.render('errors/not-found')
      // }
      if (request.qs().advisor) {
        // advisorById = await Advisor.find(request.qs().advisor)
        // console.log(request.qs().advisor);

        advisorById = await User.query()
          .where('user_id', request.qs().advisor)
          .andWhere('role', 'advisor')
        // console.log(advisorById);
        const checkAdvisorExistInAcademicYear = await UsersInAcademicYearModel.query()
          .where('user_id', advisorById[0].user_id)
          .andWhere('academic_year', AcademicYearCf[0].academic_year)
        if (checkAdvisorExistInAcademicYear && checkAdvisorExistInAcademicYear.length > 0) {
          const id = checkAdvisorExistInAcademicYear[0].id
          const result = await UsersInAcademicYearModel.query().where('advisor_ac_id', id)
          const tmp = advisorById[0].serialize()
          tmp['st'] = []
          for (let i = 0; i < result.length; i++) {
            const user = await User.query().where('user_id', result[i].user_id)
            tmp['st'].push(user[0].serialize())
          }
          // tmp['st'] = result.map((re) => re.serialize())
          studentUsersByAdOne = tmp
          // adSe.push(tmp)
        }

        // console.log(studentUsersByAdOne)
      }
      const ad = await User.query().where('role', 'advisor').preload('academicYear')
      let adSe: any = []
      for (let i = 0; i < ad.length; i++) {
        // console.log(AcademicYearCf[0].academic_year)
        // console.log(ad[i].academicYear[0].$extras.pivot_id)
        // console.log(
        // console.log(ad[i])

        const checkAdvisorExistInAcademicYear = await UsersInAcademicYearModel.query()
          .where('user_id', ad[i].user_id)
          .andWhere('academic_year', AcademicYearCf[0].academic_year)
        // console.log(checkAdvisorExistInAcademicYear)
        if (checkAdvisorExistInAcademicYear && checkAdvisorExistInAcademicYear.length > 0) {
          const id = checkAdvisorExistInAcademicYear[0].id
          const result = await UsersInAcademicYearModel.query().where('advisor_ac_id', id)
          const tmp = ad[i].serialize()

          tmp['st'] = []
          if (result && result.length > 0) {
            for (let i = 0; i < result.length; i++) {
              // console.log(result[i])
              const user = await User.query().where('user_id', result[i].user_id)
              tmp['st'].push(user[0].serialize())
            }
          }

          // tmp['st'] = result.map((re) => re.serialize())
          adSe.push(tmp)
          // console.log(tmp)
          // const tmp = ad[i].serialize()
          // tmp['st'] = result.map((re) => re.serialize())
          // adSe.push(tmp)
        }
      }
      // console.log(adSe)
      if (AcademicYearCf && AcademicYearCf.length > 0) {
        const UsersInAcademicYear = await UsersInAcademicYearModel.query().where(
          'academic_year',
          AcademicYearCf[0].academic_year
        )
        for (let i = 0; i < UsersInAcademicYear.length; i++) {
          const result = await User.query()
            .where('role', 'student')
            .andWhere('user_id', UsersInAcademicYear[i].user_id)
          // .preload('student')
          if (result[0]) {
            const resultSt = await UsersInAcademicYearModel.query()
              .where('user_id', result[0].user_id)
              .andWhere('academic_year', UsersInAcademicYear[0].academic_year)
            const students = await Student.query().where('student_id', resultSt[0].id)
            if (students[0]) {
              const resultSe = result[0].serialize()
              resultSe['approved'] = UsersInAcademicYear[i].approved
              resultSe['plan'] = students[0].plan || 0
              // console.log(resultSe)
              studentUsers.push(resultSe)
            }
          }
        }
        // console.log(studentUsers)

        allAmoutSt = studentUsers.length

        noApprove = studentUsers.filter((st) => !st.approved)
        if (request.qs().month) {
          studentUsers = studentUsers.filter(
            (userPre) => userPre.plan === parseInt(request.qs().month)
          )
        }

        const advisorUsers = await User.query().where('role', 'advisor')
        const staffUsers = await User.query().where('role', 'staff')
        for (let i = 0; i < advisorUsers.length; i++) {
          const check = await UsersInAcademicYearModel.query()
            .where('user_id', advisorUsers[i].user_id)
            .andWhere('academic_year', AcademicYearCf[0].academic_year)
          if (check && check.length > 0) {
            advisorUsersResult.push(advisorUsers[i])
          }
        }
        for (let i = 0; i < staffUsers.length; i++) {
          const check = await UsersInAcademicYearModel.query()
            .where('user_id', staffUsers[i].user_id)
            .andWhere('academic_year', AcademicYearCf[0].academic_year)
          if (check && check.length > 0) {
            // const staffUser = await User.query().where('user_id', check[0].user_id)
            // if (staffUser && staffUser.length > 0) {
            staffUsersResult.push(staffUsers[i])

            // }
          }
          // console.log(staffUsersResult)
          // console.log(check)
        }
      } else {
        studentUsers = []
      }
      // console.log(advisorUsersResult)
      // console.log(studentUsers.length)
      if (studentUsers && studentUsers.length > 0) {
        for (let i = 0; i < studentUsers.length; i++) {
          const usersInAcademicYear = await UsersInAcademicYearModel.query()
            .where('user_id', studentUsers[i].user_id)
            .andWhere('academic_year', AcademicYearCf[0].academic_year)
          const userHasDoc = await UserHasDoc.query()
            .where('user_in_academic_year_id', usersInAcademicYear[0].id)
            .orderBy('created_at', 'desc')
          // console.log(userHasDoc)
          if (userHasDoc && userHasDoc.length > 0) {
            // studentUsers[i].serialize()
            if (userHasDoc[0].status === StepStatus.WAITING) {
              studentUsers[i]['lastestStatus'] = userHasDoc[0].status + ' for ' + userHasDoc[0].step
              // console.log(studentUsers[i]['lastestStatus'])
            } else {
              studentUsers[i]['lastestStatus'] = userHasDoc[0].step + ' ' + userHasDoc[0].status
            }
          } else {
            // studentUsers[i].serialize()
            studentUsers[i]['lastestStatus'] = `No plan selected`
          }
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
      const AllStepByMonth = {}
      // const body = {}
      AllStepByMonth['2'] = Steps2Month
      AllStepByMonth['4'] = Steps4Month
      AllStepByMonth['6'] = Steps6Month
      console.log(AllStepByMonth)
      // console.log(auth.user);

      // AllStepByMonth.push(body)
      // response.cookie('year', year)
      return view.render('student-information', {
        studentUsers:
          (studentUsers && studentUsers.length > 0 && request.qs().status) || request.qs().step
            ? result
            : studentUsers,
        advisorUsers: advisorUsersResult,
        staffUsers: staffUsersResult,
        noApprove: noApprove ? noApprove.length : 0,
        allAmoutSt: allAmoutSt,
        academicYears: AcademicYearAll,
        advisorById: advisorById[0],
        studentUsersByAd: adSe,
        studentUsersByAdOne: studentUsersByAdOne,
      })
    } catch (error) {
      console.log(error)

      return response.status(400).json({ message: error.message })
    }
  }

  // public async updateSupervision({ request, response }: HttpContextContract) {
  //   try {
  //     const {
  //       date,
  //       // stepStatId,
  //       supervisionStatus,
  //       meetingLink,
  //       advisorComment,
  //       dateConfirmStatus,
  //     } = request.all()
  //     // console.log('เข้า')

  //     const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
  //     const user = await User.query().where('user_id', request.param('id'))
  //     if (user && user.length > 0) {
  //       const userAc = await UsersInAcademicYearModel.query()
  //         .where('user_id', user[0].user_id)
  //         .andWhere('academic_year', AcademicYearCf[0].academic_year)
  //       // console.log(userAc[0].id);
  //       // const UserhasSupervision = await UserHasDoc.query()
  //       //   .where('id', stepStatId)
  //       //   .andWhere('user_in_academic_year_id', userAc[0].id)
  //       //   .orderBy('updated_at', 'desc')
  //       const UserhasSupervision = new UserHasDoc()
  //       // console.log(UserhasSupervision[0])
  //       if (date) {
  //         if (user[0].role === 'advisor') {
  //           UserhasSupervision.advisor_date = date
  //         } else {
  //           UserhasSupervision.student_date = date
  //         }
  //       }

  //       if (supervisionStatus) {
  //         UserhasSupervision.supervision_status = supervisionStatus
  //       }

  //       if (meetingLink) {
  //         UserhasSupervision.meeting_link = meetingLink
  //       }

  //       if (advisorComment) {
  //         UserhasSupervision.advisor_comment = advisorComment
  //       }

  //       if (dateConfirmStatus) {
  //         UserhasSupervision.date_confirm_status = dateConfirmStatus
  //       }
  //       // console.log(UserhasSupervision[0])
  //       UserhasSupervision.user_in_academic_year_id = userAc[0].id
  //       await UserhasSupervision.save()
  //     }
  //   } catch (error) {
  //     console.log(error)

  //     return response.status(400).json({ message: error.message })
  //   }
  // }

  public async updateCourseInformation({ auth, request, response }: HttpContextContract) {
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
          AcademicYearCf.status = true
          await AcademicYearCf.save()
          if (auth.user) {
            await AcademicYearCf.related('users').attach({
              [auth.user.user_id]: {
                approved: true,
              },
            })
          }
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
      // console.log(users)
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
            await Mail.use('smtp').send((message) => {
              message
                .from('iunnuidev2@gmail.com')
                .to('iunnuidev2@gmail.com')
                .subject('Granted account')
                .htmlView('emails/confirmStaff')
            })
          }
        }

        // await AcademicYearCfResult[0].related('users').saveMany(usersArr)
      }
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async updateAdvisorHasStudent({ request, response }: HttpContextContract) {
    try {
      const { students, advisor } = request.all()
      // console.log(students, advisor.advisor_id)

      let AcademicYearCfResult: any
      AcademicYearCfResult = await AcademicYear.query().orderBy('updated_at', 'desc')
      // const advisorResult = await Advisor.query().where('advisor_id', advisor.advisor_id)
      const advisorResult = await User.query()
        .where('role', 'advisor')
        .andWhere('user_id', advisor.advisor_id)
        .join('advisors', 'users.user_id', '=', 'advisors.advisor_id')
      if (advisorResult[0].$extras.advisor_id && students && students.length > 0) {
        // console.log(advisorResult[0])
        const AdvisorInAcademicYear = await UsersInAcademicYearModel.query()
          .where('user_id', advisorResult[0].$extras.advisor_id)
          .andWhere('academic_year', AcademicYearCfResult[0].academic_year)
        // const usersInAcademicYear = await.query()
        // if () {
        // console.log(AdvisorInAcademicYear[0])
        for (let i = 0; i < students.length; i++) {
          const usi = await UsersInAcademicYearModel.query()
            .where('user_id', students[i])
            .andWhere('academic_year', AcademicYearCfResult[0].academic_year)
          usi[0].advisor_ac_id = AdvisorInAcademicYear[0].id
          await usi[0].save()
        }
        // }
        // console.log(advisorResult[0])

        // await AcademicYearCfResult[0].related('users').saveMany(usersArr)
      }
    } catch (error) {
      console.log(error)
      return response.status(400).json({ message: error.message })
    }
  }

  public async showAdvisorUser({ response }: HttpContextContract) {
    try {
      let advisorUsers: any
      // const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      // // console.log(AcademicYearCf[0].conf_id)
      // if (AcademicYearCf && AcademicYearCf.length > 0) {
      //   advisorUsers = await User.query().where('role', 'advisor')
      //   // .andWhere('conf_id', AcademicYearCf[0].conf_id)
      //   if (!advisorUsers || advisorUsers.length <= 0) {
      //     advisorUsers = await User.query().where('role', 'advisor')
      //   }
      // } else {
      advisorUsers = await User.query().where('role', 'advisor')
      //   // .andWhere('conf_id', AcademicYearCf[0].conf_id)
      // }
      // console.log(advisorUsers)
      return response.status(200).json({ advisorUsers: advisorUsers })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async showStaffUser({ response }: HttpContextContract) {
    try {
      let staffUsers: any
      // const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      // if (AcademicYearCf && AcademicYearCf.length > 0) {
      //   staffUsers = await User.query().where('role', 'staff')
      //   // .andWhere('conf_id', AcademicYearCf[0].conf_id)
      //   if (!staffUsers || staffUsers.length <= 0) {
      //     staffUsers = await User.query().where('role', 'staff')
      //   }
      // } else {
      staffUsers = await User.query().where('role', 'staff')
      // .andWhere('conf_id', AcademicYearCf[0].conf_id)
      // }

      return response.status(200).json({ staffUsers: staffUsers })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async getStaffUserCuurentYear({ request, response }: HttpContextContract) {
    try {
      let staffUsers: any = []
      // const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      let AcademicYearCf: any
      // = await AcademicYear.query().orderBy('updated_at', 'desc')
      if (request.cookie('year')) {
        AcademicYearCf = await AcademicYear.query().where('academic_year', request.cookie('year'))
      } else {
        AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      }
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

  public async getAdvisorUserCuurentYear({ request, response }: HttpContextContract) {
    try {
      let advisorUsers: any = []
      // const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      let AcademicYearCf: any
      // = await AcademicYear.query().orderBy('updated_at', 'desc')
      if (request.cookie('year')) {
        AcademicYearCf = await AcademicYear.query().where('academic_year', request.cookie('year'))
      } else {
        AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      }
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

  public async getStudentUserCuurentYear({ request, response }: HttpContextContract) {
    try {
      let studentUsers: any = []
      // const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      let AcademicYearCf: any
      // = await AcademicYear.query().orderBy('updated_at', 'desc')
      if (request.cookie('year')) {
        AcademicYearCf = await AcademicYear.query().where('academic_year', request.cookie('year'))
      } else {
        AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      }
      const users = await User.query().where('role', 'student')
      for (let i = 0; i < users.length; i++) {
        const result = await UsersInAcademicYearModel.query()
          .where('user_id', users[i].user_id)
          .andWhere('academic_year', AcademicYearCf[0].academic_year)
        if (result && result.length > 0) {
          studentUsers.push(result[0])
        }
      }
      // await UsersInAcademicYearModel.query().where()

      return response.status(200).json({ studentUsers: studentUsers })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async getStudentUserByAdvisor({ request, response }: HttpContextContract) {
    try {
      const { advisor } = request.all()
      let studentUsers: any = []
      let AcademicYearCf: any
      // = await AcademicYear.query().orderBy('updated_at', 'desc')
      if (request.cookie('year')) {
        AcademicYearCf = await AcademicYear.query().where('academic_year', request.cookie('year'))
      } else {
        AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      }
      const users = await User.query().where('role', 'student')
      for (let i = 0; i < users.length; i++) {
        const result = await UsersInAcademicYearModel.query()
          .where('user_id', users[i].user_id)
          .andWhere('academic_year', AcademicYearCf[0].academic_year)
          .andWhere('advisor_ac_id', advisor)
        if (result && result.length > 0) {
          studentUsers.push(result[0])
        }
      }
      // await UsersInAcademicYearModel.query().where()

      return response.status(200).json({ studentUsers: studentUsers })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async delUsersInAcademicYear({ request, response }: HttpContextContract) {
    try {
      // const { userId } = request.all()
      const userId = request.param('id')
      const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      const delUser = await UsersInAcademicYearModel.query()
        .where('academic_year', AcademicYearCf[0].academic_year)
        .andWhere('user_id', userId)
      await delUser[0].delete()
      return response.status(200).json('success')
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async delUsersFromAdvisor({ request, response }: HttpContextContract) {
    try {
      // const { userId } = request.all()
      const userId = request.param('id')
      const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      const delUser = await UsersInAcademicYearModel.query()
        .where('academic_year', AcademicYearCf[0].academic_year)
        .andWhere('user_id', userId)
      const newTmp = new UsersInAcademicYearModel()
      newTmp.academic_year = delUser[0].academic_year
      newTmp.user_id = delUser[0].user_id
      newTmp.approved = delUser[0].approved
      await delUser[0].delete()
      await newTmp.save()
      return response.status(200).json('success')
    } catch (error) {
      console.log(error)
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
      let AcademicYearCf: any
      if (auth.user?.role === 'student') {
        AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      } else {
        if (request.cookie('year')) {
          AcademicYearCf = await AcademicYear.query().where('academic_year', request.cookie('year'))
        } else {
          AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
        }
      }
      let studentUser: any
      let usersInAcademicYear: any
      const studentUsersRole = await User.query()
        .where('role', 'student')
        .andWhere('user_id', request.param('id'))

      if (studentUsersRole[0]) {
        usersInAcademicYear = await UsersInAcademicYearModel.query()
          .where('user_id', studentUsersRole[0].user_id)
          .andWhere('academic_year', AcademicYearCf[0].academic_year)
          .preload('student')

        if (usersInAcademicYear[0]) {
          const stSerialize = studentUsersRole[0].serialize()
          stSerialize['student'] = usersInAcademicYear[0].student
          studentUser = stSerialize
        }
      }

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
      const qs = request.qs()
      const plans = [2, 4, 6]

      let stepsRender: any =
        studentUser.student.plan === 6
          ? [
              {
                name: Steps6Month.TR01,
                // defaultFile:
              },
              {
                name: Steps6Month.TR02,
              },
              {
                name: Steps6Month.TR03_TR05_AND_SUPERVISION,
                month: [
                  [
                    {
                      name: Steps6Month.TR_03_TR_05,
                      value: Steps6Month.TR03_AND_TR05_1_6,
                    },
                    {
                      name: Steps6Month.SUPERVISION,
                      value: Steps6Month.INFORMED_SUPERVISION_1_6,
                    },
                  ],
                  [
                    {
                      name: Steps6Month.TR_03_TR_05,
                      value: Steps6Month.TR03_AND_TR05_2_6,
                    },
                    {
                      name: Steps6Month.SUPERVISION,
                      value: Steps6Month.INFORMED_SUPERVISION_2_6,
                    },
                  ],
                  [
                    {
                      name: Steps6Month.TR_03_TR_05,
                      value: Steps6Month.TR03_AND_TR05_3_6,
                    },
                    {
                      name: Steps6Month.SUPERVISION,
                      value: Steps6Month.INFORMED_SUPERVISION_3_6,
                    },
                  ],
                  [
                    {
                      name: Steps6Month.TR_03_TR_05,
                      value: Steps6Month.TR03_AND_TR05_4_6,
                    },
                    {
                      name: Steps6Month.SUPERVISION,
                      value: Steps6Month.INFORMED_SUPERVISION_4_6,
                    },
                  ],
                  [
                    {
                      name: Steps6Month.TR_03_TR_05,
                      value: Steps6Month.TR03_AND_TR05_5_6,
                    },
                    {
                      name: Steps6Month.SUPERVISION,
                      value: Steps6Month.INFORMED_SUPERVISION_5_6,
                    },
                  ],
                  [
                    {
                      name: Steps6Month.TR_03_TR_05,
                      value: Steps6Month.TR03_AND_TR05_6_6,
                    },
                    {
                      name: Steps6Month.SUPERVISION,
                      value: Steps6Month.INFORMED_SUPERVISION_6_6,
                    },
                  ],
                ],
              },
              {
                name: Steps6Month.PRESENTATION,
              },
              {
                name: Steps6Month.TR03_TR06,
              },
            ]
          : studentUser.student.plan === 4
          ? [
              {
                name: Steps4Month.TR01,
              },
              {
                name: Steps4Month.TR02,
              },
              {
                name: Steps4Month.TR03_TR05_AND_SUPERVISION,
                month: [
                  {
                    name: Steps6Month.TR_03_TR_05,
                    value: Steps4Month.TR03_AND_TR05_1_4,
                  },
                  {
                    name: Steps6Month.TR_03_TR_05,
                    value: Steps4Month.TR03_AND_TR05_2_4,
                  },
                  {
                    name: Steps6Month.TR_03_TR_05,
                    value: Steps4Month.TR03_AND_TR05_3_4,
                  },
                  {
                    name: Steps6Month.TR_03_TR_05,
                    value: Steps4Month.TR03_AND_TR05_4_4,
                  },
                ],
              },
              {
                name: Steps4Month.PRESENTATION,
              },
              {
                name: Steps4Month.TR03_AND_TR05_4_4,
              },
            ]
          : [
              {
                name: Steps2Month.TR01,
              },
              {
                name: Steps2Month.TR02,
              },
              {
                name: Steps2Month.INFORMED_SUPERVISION,
              },
              {
                name: Steps2Month.PRESENTATION,
              },
              {
                name: Steps2Month.TR03_AND_TR08,
              },
            ]
      let nextStep: any = {}
      let currentSteps: any = {}
      const disabled =
        studentUser.student.plan === null || studentUser.student.plan === 0 ? '' : 'disabled'

      let userHasDocResult: any

      userHasDocResult = await UserHasDoc.query()
        .where('user_in_academic_year_id', usersInAcademicYear[0].id)
        .orderBy('created_at', 'desc')

      let submission: any = []
      let stepFile: any
      let userHasDoc: any = []
      let isChangeStep: any = false
      let realCurrentStep: any
      let documentStatusesJsonCurrent: any
      if (userHasDocResult[0]) {
        // if (request.qs().step && request.qs().status) {
        //   userHasDoc = await UserHasDoc.query()
        //     .where('step', request.qs().step)
        //     .andWhere('status', request.qs().status)
        //     .andWhere('user_in_academic_year_id', usersInAcademicYear[0].id)
        //   isChangeStep = true
        // } else {
        //   userHasDoc.push(userHasDocResult[0])
        // }
        if (
          request.qs().step &&
          (request.qs().step.includes('TR-03 and TR-05') ||
            request.qs().step.includes('Supervision'))
        ) {
          // console.log('เข้าอันงี้')

          const step = request.qs().step
          const stepSplit = step.split('Month ')
          const stepSplitRe = stepSplit[1].split(')')
          const TrStep = request.qs().step.includes('TR-03')
            ? AllSteps.TR_03_TR_05 + ' (' + stepSplitRe[0] + '/' + studentUser.student.plan + ')'
            : AllSteps.INFORMED_SUPERVISION +
              ' (' +
              stepSplitRe[0] +
              '/' +
              studentUser.student.plan +
              ')'
          // }

          // if (request.qs().step) {
          userHasDoc = await UserHasDoc.query()
            .where('step', TrStep)
            // .andWhere('status', request.qs().status)
            .andWhere('user_in_academic_year_id', usersInAcademicYear[0].id)
          // if (!userHasDoc || userHasDoc.length <= 0) {
          //   userHasDoc.push(userHasDocResult[0])
          // }
          isChangeStep = true
        } else if (
          request.qs().step &&
          !request.qs().step.includes('TR-03 and TR-05') &&
          !request.qs().step.includes('Supervision')
        ) {
          userHasDoc = await UserHasDoc.query()
            .where('step', request.qs().step)
            // .andWhere('status', request.qs().status)
            .andWhere('user_in_academic_year_id', usersInAcademicYear[0].id)
          // if (!userHasDoc || userHasDoc.length <= 0) {
          //   userHasDoc.push(userHasDocResult[0])
          // }
          isChangeStep = true
        } else {
          userHasDoc.push(userHasDocResult[0])
        }
      }

      if (userHasDoc && userHasDoc.length > 0) {
        documentStatusesJsonCurrent = userHasDoc[0].toJSON()
        const templateFileQuery = 'template' + documentStatusesJsonCurrent.step
        const templateFile = await File.query().where('step_file_type', templateFileQuery)
        console.log(templateFile)

        currentSteps['id'] = documentStatusesJsonCurrent.id
        if (templateFile && templateFile.length > 0) {
          currentSteps['templateFile'] = templateFile[0].serialize()
        }
        currentSteps['file'] = {}
        currentSteps['file'].row = []
        currentSteps['supervision'] = {}

        const allUserHasDoc = await UserHasDoc.query().where(
          'user_in_academic_year_id',
          usersInAcademicYear[0].id
        )

        currentSteps['file'].row = []
        // currentSteps.supervision.push([])
        // currentSteps.supervision.push([])
        // currentSteps.supervision.push([])
        // currentSteps.supervision.push([])
        // currentSteps.supervision.push([])
        // currentSteps.supervision.push([])

        const objSupervision = {}
        // const objSupervision1 = {}
        // const objSupervision2 = {}
        // const objSupervision3 = {}
        // const objSupervision4 = {}
        // const objSupervision5 = {}
        for (let i = 0; i < allUserHasDoc.length; i++) {
          if (
            (documentStatusesJsonCurrent.step === 'TR-01' &&
              documentStatusesJsonCurrent.status === 'Approved' &&
              !request.qs().step) ||
            request.qs().step === 'TR-02'
          ) {
            if (allUserHasDoc[i].step === 'TR-02') {
              const currentStepFile = await File.query()
                .where('user_has_doc_id', allUserHasDoc[i].id)
                .where('step_file_type', 'signedFile')

              if (currentStepFile[0]) {
                currentSteps['file'].row.push(currentStepFile[0].serialize())
              }

              currentSteps['sentFirmDate'] = allUserHasDoc[i].advisor_date
              currentSteps['recievedFirmDate'] = allUserHasDoc[i].student_date
            }
          } else if (
            allUserHasDoc[i].step === 'TR-01' &&
            documentStatusesJsonCurrent.step === 'TR-01'
          ) {
            const result = await File.query().where('user_has_doc_id', allUserHasDoc[i].id)
            const StFileResult = await File.query()
              .where('user_has_doc_id', allUserHasDoc[i].id)
              .andWhere('step_file_type', 'studentFile')
            const feedbackFileResult = await File.query()
              .where('user_has_doc_id', allUserHasDoc[i].id)
              .andWhere('step_file_type', 'feedbackFile')
            const signedFileResult = await File.query()
              .where('user_has_doc_id', allUserHasDoc[i].id)
              .andWhere('step_file_type', 'signedFile')

            const obj = {}
            obj['feedbackFile'] = {}
            obj['signedFile'] = {}
            obj['studentFile'] = {}
            obj['reason'] = {}

            if (result && result.length > 0) {
              if (allUserHasDoc[i].is_react || allUserHasDoc[i].is_signed) {
                obj['studentFile'] =
                  StFileResult && StFileResult.length > 0 ? StFileResult[0].serialize() : {}
                if (!allUserHasDoc[i].is_signed) {
                  obj['feedbackFile'] =
                    feedbackFileResult && feedbackFileResult.length > 0
                      ? feedbackFileResult[0].serialize()
                      : {}
                }
                if (allUserHasDoc[i].is_signed) {
                  obj['signedFile'] =
                    signedFileResult && signedFileResult.length > 0
                      ? signedFileResult[0].serialize()
                      : {}
                }
              } else if (!allUserHasDoc[i].is_signed && !allUserHasDoc[i].is_react) {
                obj['studentFile'] =
                  StFileResult && StFileResult.length > 0 ? StFileResult[0].serialize() : {}
              }
            }

            if (allUserHasDoc[i].is_react || allUserHasDoc[i].is_signed) {
              obj['studentFile'] =
                StFileResult && StFileResult.length > 0 ? StFileResult[0].serialize() : {}
            }
            if (allUserHasDoc[i].no_approve_reason) {
              obj['reason'] = {
                body: allUserHasDoc[i].no_approve_reason,
                date: allUserHasDoc[i].updatedAt,
              }
            }
            currentSteps['file'].row.push(obj)
          } else if (
            (documentStatusesJsonCurrent.step.includes('TR-03 and TR-05') &&
              documentStatusesJsonCurrent.status === 'Approved' &&
              !request.qs().step) ||
            (request.qs().step && request.qs().step.includes('Supervision')) ||
            (documentStatusesJsonCurrent.step &&
              documentStatusesJsonCurrent.step.includes('Informed') &&
              documentStatusesJsonCurrent.status !== 'Approved')
          ) {
            if (
              allUserHasDoc[i] &&
              allUserHasDoc[i].step &&
              allUserHasDoc[i].step.includes('Informed')
            ) {
              // if (allUserHasDoc[i].step === 'Informed supervision (1/6)') {
              if (allUserHasDoc[i].step === documentStatusesJsonCurrent.step) {
                objSupervision['advisorDate'] = allUserHasDoc[i].advisor_date
                objSupervision['studentDate'] = allUserHasDoc[i].student_date
                objSupervision['completeDate'] = allUserHasDoc[i].complete_date
                objSupervision['meetingLink'] = allUserHasDoc[i].meeting_link
                objSupervision['supervisionStatus'] = allUserHasDoc[i].supervision_status
                objSupervision['dateConfirmStatus'] = allUserHasDoc[i].date_confirm_status
                objSupervision['is_new'] = allUserHasDoc[i].is_new
                if (
                  !(
                    objSupervision && // 👈 null and undefined check
                    Object.keys(objSupervision).length === 0 &&
                    Object.getPrototypeOf(objSupervision) === Object.prototype
                  )
                ) {
                  currentSteps['supervision'] = objSupervision
                }
              }
              // }
              // } else if (allUserHasDoc[i].step === 'Informed supervision (2/6)') {
              //   objSupervision1['advisorDate'] = allUserHasDoc[i].advisor_date
              //   objSupervision1['studentDate'] = allUserHasDoc[i].student_date
              //   objSupervision1['completeDate'] = allUserHasDoc[i].complete_date
              //   objSupervision1['meetingLink'] = allUserHasDoc[i].meeting_link
              //   objSupervision1['supervisionStatus'] = allUserHasDoc[i].supervision_status
              //   objSupervision1['dateConfirmStatus'] = allUserHasDoc[i].date_confirm_status
              //   currentSteps.supervision[1].push(objSupervision1)
              // } else if (allUserHasDoc[i].step === 'Informed supervision (3/6)') {
              //   objSupervision2['advisorDate'] = allUserHasDoc[i].advisor_date
              //   objSupervision2['studentDate'] = allUserHasDoc[i].student_date
              //   objSupervision2['completeDate'] = allUserHasDoc[i].complete_date
              //   objSupervision2['meetingLink'] = allUserHasDoc[i].meeting_link
              //   objSupervision2['supervisionStatus'] = allUserHasDoc[i].supervision_status
              //   objSupervision2['dateConfirmStatus'] = allUserHasDoc[i].date_confirm_status
              //   currentSteps.supervision[2].push(objSupervision2)
              // } else if (allUserHasDoc[i].step === 'Informed supervision (4/6)') {
              //   objSupervision3['advisorDate'] = allUserHasDoc[i].advisor_date
              //   objSupervision3['studentDate'] = allUserHasDoc[i].student_date
              //   objSupervision3['completeDate'] = allUserHasDoc[i].complete_date
              //   objSupervision3['meetingLink'] = allUserHasDoc[i].meeting_link
              //   objSupervision3['supervisionStatus'] = allUserHasDoc[i].supervision_status
              //   objSupervision3['dateConfirmStatus'] = allUserHasDoc[i].date_confirm_status
              //   currentSteps.supervision[3].push(objSupervision3)
              //   // currentSteps['supervision']['m4'].push(objSupervision)
              // } else if (allUserHasDoc[i].step === 'Informed supervision (5/6)') {
              //   objSupervision4['advisorDate'] = allUserHasDoc[i].advisor_date
              //   objSupervision4['studentDate'] = allUserHasDoc[i].student_date
              //   objSupervision4['completeDate'] = allUserHasDoc[i].complete_date
              //   objSupervision4['meetingLink'] = allUserHasDoc[i].meeting_link
              //   objSupervision4['supervisionStatus'] = allUserHasDoc[i].supervision_status
              //   objSupervision4['dateConfirmStatus'] = allUserHasDoc[i].date_confirm_status
              //   currentSteps.supervision[4].push(objSupervision4)
              //   // currentSteps['supervision']['m5'].push(objSupervision)
              // } else if (allUserHasDoc[i].step === 'Informed supervision (6/6)') {
              //   objSupervision5['advisorDate'] = allUserHasDoc[i].advisor_date
              //   objSupervision5['studentDate'] = allUserHasDoc[i].student_date
              //   objSupervision5['completeDate'] = allUserHasDoc[i].complete_date
              //   objSupervision5['meetingLink'] = allUserHasDoc[i].meeting_link
              //   objSupervision5['supervisionStatus'] = allUserHasDoc[i].supervision_status
              //   objSupervision5['dateConfirmStatus'] = allUserHasDoc[i].date_confirm_status
              //   currentSteps.supervision[5].push(objSupervision5)
              //   // currentSteps['supervision']['m6'].push(objSupervision)
              // } else if (allUserHasDoc[i].step === 'Informed supervision (1/4)') {
              //   objSupervision['advisorDate'] = allUserHasDoc[i].advisor_date
              //   objSupervision['studentDate'] = allUserHasDoc[i].student_date
              //   objSupervision['completeDate'] = allUserHasDoc[i].complete_date
              //   objSupervision['meetingLink'] = allUserHasDoc[i].meeting_link
              //   objSupervision['supervisionStatus'] = allUserHasDoc[i].supervision_status
              //   objSupervision['dateConfirmStatus'] = allUserHasDoc[i].date_confirm_status
              //   currentSteps.supervision[0].push(objSupervision)
              //   // currentSteps['supervision']['m1'].push(objSupervision)
              // } else if (allUserHasDoc[i].step === 'Informed supervision (2/4)') {
              //   objSupervision1['advisorDate'] = allUserHasDoc[i].advisor_date
              //   objSupervision1['studentDate'] = allUserHasDoc[i].student_date
              //   objSupervision1['completeDate'] = allUserHasDoc[i].complete_date
              //   objSupervision1['meetingLink'] = allUserHasDoc[i].meeting_link
              //   objSupervision1['supervisionStatus'] = allUserHasDoc[i].supervision_status
              //   objSupervision1['dateConfirmStatus'] = allUserHasDoc[i].date_confirm_status
              //   currentSteps.supervision[1].push(objSupervision1)
              //   // currentSteps['supervision']['m2'].push(objSupervision)
              // } else if (allUserHasDoc[i].step === 'Informed supervision (3/4)') {
              //   objSupervision2['advisorDate'] = allUserHasDoc[i].advisor_date
              //   objSupervision2['studentDate'] = allUserHasDoc[i].student_date
              //   objSupervision2['completeDate'] = allUserHasDoc[i].complete_date
              //   objSupervision2['meetingLink'] = allUserHasDoc[i].meeting_link
              //   objSupervision2['supervisionStatus'] = allUserHasDoc[i].supervision_status
              //   objSupervision2['dateConfirmStatus'] = allUserHasDoc[i].date_confirm_status
              //   currentSteps.supervision[2].push(objSupervision2)
              //   // currentSteps['supervision']['m3'].push(objSupervision)
              // } else if (allUserHasDoc[i].step === 'Informed supervision (4/4)') {
              //   objSupervision3['advisorDate'] = allUserHasDoc[i].advisor_date
              //   objSupervision3['studentDate'] = allUserHasDoc[i].student_date
              //   objSupervision3['completeDate'] = allUserHasDoc[i].complete_date
              //   objSupervision3['meetingLink'] = allUserHasDoc[i].meeting_link
              //   objSupervision3['supervisionStatus'] = allUserHasDoc[i].supervision_status
              //   objSupervision3['dateConfirmStatus'] = allUserHasDoc[i].date_confirm_status
              //   currentSteps.supervision[3].push(objSupervision3)
              //   // currentSteps['supervision']['m4'].push(objSupervision)
              // } else if (allUserHasDoc[i].step === 'Informed supervision') {
              //   objSupervision['advisorDate'] = allUserHasDoc[i].advisor_date
              //   objSupervision['studentDate'] = allUserHasDoc[i].student_date
              //   objSupervision['completeDate'] = allUserHasDoc[i].complete_date
              //   objSupervision['meetingLink'] = allUserHasDoc[i].meeting_link
              //   objSupervision['supervisionStatus'] = allUserHasDoc[i].supervision_status
              //   objSupervision['dateConfirmStatus'] = allUserHasDoc[i].date_confirm_status
              //   currentSteps.supervision[0].push(objSupervision)
              // }
            }
          } else if (
            allUserHasDoc[i].step.includes('TR-03') &&
            documentStatusesJsonCurrent.step.includes('TR-03')
          ) {
            // if (allUserHasDoc[i].step === 'TR-02') {
            //   const currentStepFile = await File.query()
            //     .where('user_has_doc_id', allUserHasDoc[i].id)
            //     .where('step_file_type', 'signedFile')

            //   if (currentStepFile[0]) {
            //     currentSteps['file'].row.push(currentStepFile[0].serialize())
            //   }
            // }
            // console.log(request.qs().step)

            // console.log(allUserHasDoc[i].step)
            // console.log(documentStatusesJsonCurrent.step)

            if (allUserHasDoc[i].step === documentStatusesJsonCurrent.step) {
              const obj = {}
              obj['studentFile'] = {}
              obj['feedbackFile'] = {}
              obj['reason'] = ''
              const StFileResult = await File.query()
                .where('user_has_doc_id', allUserHasDoc[i].id)
                .andWhere('step_file_type', 'studentFile')
              const feedbackFileResult = await File.query()
                .where('user_has_doc_id', allUserHasDoc[i].id)
                .andWhere('step_file_type', 'feedbackFile')
              if (allUserHasDoc[i].is_react) {
                if (feedbackFileResult[0]) {
                  obj['feedbackFile'] = feedbackFileResult[0].serialize()
                }

                if (StFileResult[0]) {
                  obj['studentFile'] = StFileResult[0].serialize()
                }
              } else {
                if (StFileResult[0]) {
                  obj['studentFile'] = StFileResult[0].serialize()
                }
              }
              if (allUserHasDoc[i].no_approve_reason) {
                obj['reason'] = {
                  body: allUserHasDoc[i].no_approve_reason,
                  date: allUserHasDoc[i].updatedAt,
                }
              }
              if (
                !(
                  obj && // 👈 null and undefined check
                  Object.keys(obj).length === 0 &&
                  Object.getPrototypeOf(obj) === Object.prototype
                )
              ) {
                // if (allUserHasDoc[i].step === 'TR-03 and TR-05 (1/6)') {
                //   currentSteps['file'].row[0].push(obj)
                // } else if (allUserHasDoc[i].step === 'TR-03 and TR-05 (2/6)') {
                //   currentSteps['file'].row[1].push(obj)
                // } else if (allUserHasDoc[i].step === 'Informed supervision (3/6)') {
                //   currentSteps['file'].row[2].push(obj)
                // } else if (allUserHasDoc[i].step === 'Informed supervision (4/6)') {
                //   currentSteps['file'].row[3].push(obj)
                //   // currentSteps['supervision']['m4'].push(objSupervision)
                // } else if (allUserHasDoc[i].step === 'Informed supervision (5/6)') {
                //   currentSteps['file'].row[4].push(obj)
                //   // currentSteps['supervision']['m5'].push(objSupervision)
                // } else if (allUserHasDoc[i].step === 'Informed supervision (6/6)') {
                //   currentSteps['file'].row[5].push(obj)
                //   // currentSteps['supervision']['m6'].push(objSupervision)
                // } else if (allUserHasDoc[i].step === 'Informed supervision (1/4)') {
                //   currentSteps.supervision[0].push(objSupervision)
                //   // currentSteps['supervision']['m1'].push(objSupervision)
                // } else if (allUserHasDoc[i].step === 'Informed supervision (2/4)') {
                //   currentSteps.supervision[1].push(objSupervision1)
                //   // currentSteps['supervision']['m2'].push(objSupervision)
                // } else if (allUserHasDoc[i].step === 'Informed supervision (3/4)') {
                //   currentSteps.supervision[2].push(objSupervision2)
                //   // currentSteps['supervision']['m3'].push(objSupervision)
                // } else if (allUserHasDoc[i].step === 'Informed supervision (4/4)') {
                //   currentSteps.supervision[3].push(objSupervision3)
                //   // currentSteps['supervision']['m4'].push(objSupervision)
                // } else if (allUserHasDoc[i].step === 'Informed supervision') {
                //   currentSteps.supervision[0].push(objSupervision)
                //   // currentSteps['supervision']['m1'].push(objSupervision)
                // }
                currentSteps['file'].row.push(obj)
                // break
              }
            }
          } else if (
            (documentStatusesJsonCurrent.step === 'Presentation' &&
              documentStatusesJsonCurrent.status === 'Approved' &&
              !request.qs().step) ||
            request.qs().step === 'TR-03 and TR-08' ||
            request.qs().step === 'TR-03 and TR-06'
          ) {
            if (allUserHasDoc[i].step === documentStatusesJsonCurrent.step) {
              const obj = {}
              obj['studentFile'] = {}
              obj['feedbackFile'] = {}
              obj['reason'] = ''
              const StFileResult = await File.query()
                .where('user_has_doc_id', allUserHasDoc[i].id)
                .andWhere('step_file_type', 'studentFile')
              const feedbackFileResult = await File.query()
                .where('user_has_doc_id', allUserHasDoc[i].id)
                .andWhere('step_file_type', 'feedbackFile')
              if (allUserHasDoc[i].is_react) {
                if (feedbackFileResult[0]) {
                  obj['feedbackFile'] = feedbackFileResult[0].serialize()
                }

                if (StFileResult[0]) {
                  obj['studentFile'] = StFileResult[0].serialize()
                }
              } else {
                if (StFileResult[0]) {
                  obj['studentFile'] = StFileResult[0].serialize()
                }
              }
              if (allUserHasDoc[i].no_approve_reason) {
                obj['reason'] = {
                  body: allUserHasDoc[i].no_approve_reason,
                  date: allUserHasDoc[i].updatedAt,
                }
              }
              if (
                !(
                  obj && // 👈 null and undefined check
                  Object.keys(obj).length === 0 &&
                  Object.getPrototypeOf(obj) === Object.prototype
                )
              ) {
                currentSteps['file'].row.push(obj)
              }
            }
          } else if (
            allUserHasDoc[i].step.includes('Presentation') &&
            documentStatusesJsonCurrent.step.includes('Presentation')
          ) {
            if (allUserHasDoc[i].step === documentStatusesJsonCurrent.step) {
              const currentStepFile = await File.query()
                .where('user_has_doc_id', allUserHasDoc[i].id)
                .where('step_file_type', 'signedFile')
              // console.log("laskdkasl");

              if (currentStepFile[0]) {
                currentSteps['file'].row.push(currentStepFile[0].serialize())
              }
            }
          }
        }

        currentSteps['name'] = documentStatusesJsonCurrent.step
        currentSteps['status'] = documentStatusesJsonCurrent.status
        currentSteps['createAt'] = moment(documentStatusesJsonCurrent.created_at.toString())
          .tz('Asia/Bangkok')
          .format('MMMM D, YYYY h:mm A')
        let stepIndex: any
        let monthStepIndex: any
        let stepsRenderIndex: any
        if (
          currentSteps['name'].includes(AllSteps.TR_03_TR_05) ||
          currentSteps['name'].includes(AllSteps.INFORMED_SUPERVISION) ||
          (currentSteps['name'] === AllSteps.TR02 && currentSteps['status'] === 'Approved')
        ) {
          stepsRenderIndex = stepsRender.findIndex(
            (step) => step.name === AllSteps.TR03_TR05_AND_SUPERVISION
          )

          for (let i = 0; i < stepsRender[stepsRenderIndex].month.length; i++) {
            for (let j = 0; j < stepsRender[stepsRenderIndex].month[i].length; j++) {
              if (stepsRender[stepsRenderIndex].month[i][j].value === currentSteps['name']) {
                stepIndex = j
                monthStepIndex = i
                // console.log(stepsRender[stepsRenderIndex].month[monthStepIndex][stepIndex]);
                break
              }
            }
          }
          // console.log(stepsRender[stepsRenderIndex].month[monthStepIndex][stepIndex]);
          // stepIndex = stepsRender[stepsRenderIndex].month.findIndex((word) =>
          //   word.findIndex((sub) => sub.value === 'TR-03 and TR-05 (4/6)')
          // )

          // monthStepIndex = stepsRender[stepsRenderIndex].month.findIndex(
          //   (word) => word[stepIndex].value === currentSteps['name']
          // )
          // console.log(currentSteps['name'])
          // console.log(stepsRenderIndex)
          // console.log(monthStepIndex)
          // console.log(stepIndex)
          // // console.log(stepIndex)
          // // console.log(monthStepIndex)
          // console.log(stepsRender[stepsRenderIndex].month[monthStepIndex][stepIndex]);
        } else {
          stepIndex = stepsRender.findIndex((word) => word.name === currentSteps['name'])
        }
        // if (
        //   currentSteps['name'].includes(AllSteps.TR_03_TR_05) ||
        //   currentSteps['name'].includes(AllSteps.INFORMED_SUPERVISION)
        // ) {
        //   console.log('เข้า')

        //   stepIndex = stepsRender.findIndex(
        //     (word) => word.month['value'] === currentSteps['name']
        //   )
        // } else {
        //   stepIndex = stepsRender.findIndex((word) => word.name === currentSteps['name'])
        // }
        // console.log(currentSteps['name'])
        // console.log(stepIndex)

        // stepsRender[stepIndex]['status'] = userHasDoc[0].status
        // stepsRender[stepsRenderIndex].month[monthStepIndex][stepIndex]['status'] =
        //   userHasDoc[0].status
        if (userHasDoc[0].status === 'Approved') {
          // stepsRender[stepsRenderIndex].month[monthStepIndex]
          //   ? stepsRender[stepsRenderIndex].month[monthStepIndex][stepIndex +]
          //   : stepsRender[stepsRenderIndex].month[monthStepIndex]
          // monthStepIndex === 5 ? stepsRender[stepsRenderIndex + 1] ? stepsRender[stepsRenderIndex + 1] : stepsRender[stepsRenderIndex]
          if (
            currentSteps['name'].includes(AllSteps.TR_03_TR_05) ||
            currentSteps['name'].includes(AllSteps.INFORMED_SUPERVISION) ||
            (currentSteps['name'] === AllSteps.TR02 && currentSteps['status'] === 'Approved')
          ) {
            if (currentSteps['name'] === AllSteps.TR02 && currentSteps['status'] === 'Approved') {
              // console.log(nextStep = stepsRender[stepsRenderIndex].month[0][0]);

              nextStep['name'] = stepsRender[stepsRenderIndex].month[0][0].value
            } else {
              if (stepIndex >= 0) {
                nextStep['name'] =
                  stepIndex === 1
                    ? stepsRender[stepsRenderIndex].month[monthStepIndex + 1]
                      ? stepsRender[stepsRenderIndex].month[monthStepIndex + 1][0].value
                      : stepsRender[stepsRenderIndex + 1].name
                      ? stepsRender[stepsRenderIndex + 1]
                      : stepsRender[stepsRenderIndex].name
                    : stepsRender[stepsRenderIndex].month[monthStepIndex][1].value
              }
            }

            // ? stepsRender[stepsRenderIndex].month[monthStepIndex][1]
            // : stepsRender[stepsRenderIndex + 1]
            // ? stepsRender[stepsRenderIndex + 1]
            // : stepsRender[stepsRenderIndex]
          } else {
            // console.log('เข้าอันงี้')
            // console.log(stepsRender[stepIndex + 1])
            if (stepIndex >= 0) {
              nextStep['name'] = stepsRender[stepIndex + 1]
                ? stepsRender[stepIndex + 1].name
                : stepsRender[stepIndex].name
            }
          }
          // stepsRender[stepsRenderIndex]
        } else {
          if (
            currentSteps['name'].includes(AllSteps.TR_03_TR_05) ||
            currentSteps['name'].includes(AllSteps.INFORMED_SUPERVISION)
          ) {
            // console.log(stepIndex)
            // // console.log(stepIndex)
            // console.log(monthStepIndex)
            if (stepIndex >= 0) {
              nextStep['name'] =
                stepsRender[stepsRenderIndex].month[monthStepIndex][stepIndex].value
            }
          } else {
            if (stepIndex >= 0) {
              nextStep['name'] = stepsRender[stepIndex].name
            }
          }
          // }
        }
        // const userHasDocForRC = await UserHasDoc.query()
        //   .where('user_in_academic_year_id', usersInAcademicYear[0].id)
        //   .orderBy('created_at', 'desc')

        // realCurrentStep = steps.findIndex((step) => step.name === userHasDocForRC[0].step)
      } else if (
        request.qs().step &&
        (request.qs().step.includes('TR-03 and TR-05') || request.qs().step.includes('Supervision'))
      ) {
        // console.log('เข้าอันงี้')

        const step = request.qs().step
        const stepSplit = step.split('Month ')
        const stepSplitRe = stepSplit[1].split(')')
        const TrStep = request.qs().step.includes('TR-03')
          ? AllSteps.TR_03_TR_05 + ' (' + stepSplitRe[0] + '/' + studentUser.student.plan + ')'
          : AllSteps.INFORMED_SUPERVISION +
            ' (' +
            stepSplitRe[0] +
            '/' +
            studentUser.student.plan +
            ')'

        currentSteps['name'] = TrStep
        currentSteps['status'] = ''
        currentSteps['createAt'] = ''
        currentSteps['reason'] = ''
        currentSteps['file'] = {}
        currentSteps['supervision'] = {}
        nextStep['name'] = TrStep
      } else if (
        request.qs().step &&
        !(
          request.qs().step.includes('TR-03 and TR-05') || request.qs().step.includes('Supervision')
        )
      ) {
        // console.log('เข้าอันงี้')

        currentSteps['name'] = request.qs().step
        currentSteps['status'] = ''
        currentSteps['createAt'] = ''
        currentSteps['reason'] = ''
        currentSteps['file'] = {}
        currentSteps['supervision'] = {}
        nextStep['name'] = request.qs().step
      } else {
        currentSteps['name'] = stepsRender[0].name
        currentSteps['status'] = ''
        currentSteps['createAt'] = ''
        currentSteps['reason'] = ''
        currentSteps['file'] = {}
        currentSteps['supervision'] = {}
        nextStep = stepsRender[0]
      }

      // if (currentSteps.supervision) {
      //   currentSteps.supervision = currentSteps.supervision.filter((n) => n.length !== 0)
      // }

      for (let i = 0; i < stepsRender.length; i++) {
        // console.log(stepsRender[i]['name'])

        if (
          stepsRender[i]['name'].includes('Supervision')
          // ||
          // stepsRender[i]['name'].includes('TR-03 and TR-05 (')
          // ||
          // stepsRender[i]['name'].includes(AllSteps.INFORMED_SUPERVISION)
        ) {
          // console.log("เข้่า")
          for (let j = 0; j < stepsRender[i].month.length; j++) {
            for (let k = 0; k < stepsRender[i].month[j].length; k++) {
              // console.log(stepsRender[i].month[j][k]);
              // console.log('เข้า่นี่2')
              const allLastestStepStat = await UserHasDoc.query()
                .where('step', stepsRender[i].month[j][k].value)
                .andWhere('user_in_academic_year_id', usersInAcademicYear[0].id)
                .orderBy('created_at', 'desc')
              // console.log('เข้่า')

              if (allLastestStepStat && allLastestStepStat.length > 0) {
                stepsRender[i].month[j][k]['status'] = allLastestStepStat[0].status
              }
            }
          }
        } else {
          // console.log('เข้า่นี่')

          const allLastestStepStat = await UserHasDoc.query()
            .where('step', stepsRender[i].name)
            .andWhere('user_in_academic_year_id', usersInAcademicYear[0].id)
            .orderBy('created_at', 'desc')
          if (allLastestStepStat && allLastestStepStat.length > 0) {
            const stepIndexTmp = stepsRender.findIndex(
              (word) => word.name === allLastestStepStat[0].step
            )
            stepsRender[stepIndexTmp]['status'] = allLastestStepStat[0].status
          }
        }
        // steps[i]['status'] = 'Approved'
      }
      console.log(currentSteps)
      // console.log(stepsRender[2].month)
      // console.log(stepsRender)
      console.log(currentSteps.supervision)
      // console.log(currentSteps.file.row)
      // console.log(currentSteps.file.row)
      // console.log(currentSteps.file.signedFile)
      // console.log(currentSteps.file.studentFile[0])
      console.log(nextStep)
      const academicYearAll = await AcademicYear.query().orderBy('updated_at', 'desc')
      // return response.redirect('/student/' + studentUser.student.student_id)
      return view.render('student-information', {
        studentUser,
        plans,
        isChangeStep,
        disabled,
        nextStep,
        currentSteps,
        // stepPaged,
        stepsRender,
        // firstOfAllStep,
        // lastOfAllStep,
        submission: submission,
        studentInfo: studentInfo,
        academicYears: academicYearAll,
        // userHasDoc: userHasDoc[0].id,
      })
      // return response.redirect('/announcement')
    } catch (error) {
      console.log(error)

      return response.status(400).json({ message: error.message })
    }
  }

  public async updateStudentUserStatus({ auth, request, response }: HttpContextContract) {
    try {
      const {
        study,
        status,
        step,
        reason,
        date,
        completeDate,
        // stepStatId,
        supervisionStatus,
        meetingLink,
        advisorComment,
        dateConfirmStatus,
        isSigned,
      } = request.only([
        'study',
        'status',
        'step',
        'reason',
        'date',
        'stepStatId',
        'supervisionStatus',
        'meetingLink',
        'advisorComment',
        'dateConfirmStatus',
        'isSigned',
        'completeDate',
      ])
      // console.log('เข้า')

      // console.log(status)
      // console.log(step)
      console.log('เข้า')
      // const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      const years = await AcademicYear.query().orderBy('updated_at', 'desc')
      let studentUser: any
      let usersInAcademicYear: any
      const studentUsersRole = await User.query()
        .where('role', 'student')
        .andWhere('user_id', request.param('id'))
      // .preload('student')
      // const studentUser = studentUsers[0]
      // console.log('เข้า')
      if (studentUsersRole[0]) {
        usersInAcademicYear = await UsersInAcademicYearModel.query()
          .where('user_id', studentUsersRole[0].user_id)
          .andWhere('academic_year', years[0].academic_year)
          .preload('student')
      }
      let user: any
      if (auth.user) {
        user = await User.query().where('user_id', auth.user.user_id)
      }

      // const usersInAcademicYear = await UsersInAcademicYearModel.query()
      //   .where('user_id', studentUser.student_id)
      //   .andWhere('academic_year', AcademicYearCf[0].academic_year)
      // let statusResult: Status
      // console.log(status)
      // console.log(step)

      // let docResult: Document
      if (study) {
        usersInAcademicYear[0].student.plan = study
        // console.log(usersInAcademicYear[0].student)
        await usersInAcademicYear[0].student.save()

        // await studentUser
        //   .related('documentsStatuses')
        //   .query()
        //   .wherePivot('student_id', studentUser.student_id)
        //   .delete()
        // console.log(usersInAcademicYear[0].id)
        const userHasDoc = await UserHasDoc.query().where(
          'user_in_academic_year_id',
          usersInAcademicYear[0].id
        )
        // const userHasDoc = await usersInAcademicYear[0].related('stepsStatuses').query()
        // console.log(userHasDoc[0])

        if (userHasDoc && userHasDoc.length > 0) {
          for (let i = 0; i < userHasDoc.length; i++) {
            await File.query().where('user_has_doc_id', userHasDoc[i].id).delete()
            userHasDoc[i].delete()
          }
          // await File.query().where('user_has_doc_id', userHasDoc[0].id).delete()
          // await usersInAcademicYear[0].related('userHasDoc').
          // userHasDoc[0].delete()
        }
        return response.redirect('/student-information/' + usersInAcademicYear[0].user_id)
        // await usersInAcademicYear[0].related('stepsStatuses').query().delete()
      }

      const body = {}
      if (status && step) {
        body['status'] = status
        body['step'] = step
        body['is_react'] =
          auth.user?.role === 'advisor' || auth.user?.role === 'staff' ? true : false
        body['is_signed'] =
          auth.user?.role === 'advisor' || auth.user?.role === 'staff' ? isSigned : false
        body['no_approve_reason'] =
          reason && reason !== null && status === 'Disapproved' ? reason : null
        if (step.includes('Informed')) {
          body['is_new'] = auth.user?.role === 'student' ? false : true
        }
      }
      // console.log(body)

      if (date) {
        if (user[0].role === 'advisor') {
          body['advisor_date'] = date
        } else {
          body['student_date'] = date
          body['is_react'] = true
          body['is_signed'] = isSigned
        }
      }

      if (completeDate) {
        body['complete_date'] = completeDate
      }

      if (supervisionStatus) {
        body['supervision_status'] = supervisionStatus
      }

      if (meetingLink) {
        body['meeting_link'] = meetingLink
      }

      // if (advisorComment) {
      //   body['advisor_comment'] = advisorComment
      // }

      if (dateConfirmStatus) {
        body['date_confirm_status'] = dateConfirmStatus
      }

      if (status && status !== StepStatus.PENDING && step && step !== AllSteps.TR02) {
        const stepTracking = await usersInAcademicYear[0]
          .related('userHasDoc')
          .query()
          .orderBy('created_at', 'desc')
        // stepTracking[0].status = body['status']
        for (let i = 0; i < Object.keys(body).length; i++) {
          stepTracking[0][Object.keys(body)[i]] = body[Object.keys(body)[i]]
        }
        await stepTracking[0].save()
        // if (step.includes('TR-03 and TR-05') && status === StepStatus.APPROVED) {
        //   const body = {}
        //   const test = Object.keys(AllSteps).find((key) => AllSteps[key] === step)
        //   const indexOfS = Object.keys(AllSteps).indexOf(test ? test : '')
        //   const s = Object.values(AllSteps)[indexOfS + 1]
        //   // console.log(s)
        //   body['step'] = s
        //   // if(!s.includes('3/4') || !s.includes('3') )
        //   await usersInAcademicYear[0].related('userHasDoc').create(body)
        // }
        // console.log(test)
      } else {
        await usersInAcademicYear[0].related('userHasDoc').create(body)
      }
      return response.status(200).json('success')
    } catch (error) {
      console.log(error)
      return response.status(400).json({ message: error.message })
    }
  }

  public async updateSupervisionStatus({ request, response }: HttpContextContract) {
    try {
      const { step, supervisionStatus, dateConfirmStatus } = request.only([
        'step',
        'supervisionStatus',
        'dateConfirmStatus',
      ])
      let supervision
      let usersInAcademicYear: any
      console.log('เข้าเมตอดนี้นะ')

      const years = await AcademicYear.query().orderBy('updated_at', 'desc')
      const studentUsersRole = await User.query()
        .where('role', 'student')
        .andWhere('user_id', request.param('id'))
      // .preload('student')
      // const studentUser = studentUsers[0]
      // console.log('เข้า')
      if (studentUsersRole[0]) {
        usersInAcademicYear = await UsersInAcademicYearModel.query()
          .where('user_id', studentUsersRole[0].user_id)
          .andWhere('academic_year', years[0].academic_year)
          .preload('student')
      }
      if (step && step.includes('TR-03 and TR-05')) {
        const test = Object.keys(AllSteps).find((key) => AllSteps[key] === step)
        const indexOfS = Object.keys(AllSteps).indexOf(test ? test : '')
        const s = Object.values(AllSteps)[indexOfS + 1]
        supervision = await usersInAcademicYear[0]
          .related('userHasDoc')
          .query()
          .where('step', s)
          .orderBy('created_at', 'desc')
      } else {
        supervision = await usersInAcademicYear[0]
          .related('userHasDoc')
          .query()
          .where('step', step)
          .orderBy('created_at', 'desc')
      }

      if (supervision[0]) {
        dateConfirmStatus ? (supervision[0].date_confirm_status = dateConfirmStatus) : null
        supervisionStatus ? (supervision[0].supervision_status = supervisionStatus) : null
        await supervision[0].save()
      }

      return response.status(200).json('success')
    } catch (error) {
      console.log(error)
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
        await Mail.use('smtp').send((message) => {
          message
            .from('iunnuidev2@gmail.com')
            .to('iunnuidev2@gmail.com')
            .subject('You have been approved')
            .htmlView('emails/confirm')
        })
      })
      // if (approve) {
      //   response.redirect(`/students/request`)
      // } else {
      //   response.redirect(`/student/${studentUser.user_id}/information`)
      // }
      // response.status(200).send('success')
      const studentUsers = await User.query().where('user_id', request.param('id'))
      // .preload('student')
      const studentUser = studentUsers[0]
      response.redirect(`/student/${studentUser.user_id}`)
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
        // advisorFullName,
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

      const years = await AcademicYear.query().orderBy('updated_at', 'desc')
      let studentUser: any
      let usersInAcademicYear: any
      const studentUsersRole = await User.query()
        .where('role', 'student')
        .andWhere('user_id', request.param('id'))
      // .preload('student')
      // const studentUser = studentUsers[0]

      if (studentUsersRole[0]) {
        usersInAcademicYear = await UsersInAcademicYearModel.query()
          .where('user_id', studentUsersRole[0].user_id)
          .andWhere('academic_year', years[0].academic_year)
          .preload('student')
        console.log(usersInAcademicYear[0])

        if (usersInAcademicYear[0]) {
          // const stSerialize = studentUsersRole[0].serialize()
          // stSerialize['student'] = usersInAcademicYear[0].student
          studentUser = usersInAcademicYear[0].student
        }
      }
      console.log(studentUser)

      // const studentUsers = await User.query()
      //   .where('user_id', request.param('id'))
      //   .preload('student')
      // const studentUser = studentUsers[0]
      // const studentUser = await Student.findOrFail(request.param('id'))
      studentUser.firm = firm
      studentUser.tel = tel
      studentUser.department = department
      studentUser.position = position
      studentUser.plan = duration
      studentUser.mentor_name = mentor
      studentUser.mentor_position = mentorPosition
      studentUser.mentor_email = mentorEmail
      studentUser.mentor_tel_no = mentorTel
      // studentUser.email = email
      // studentUser.approved = approve
      // if (email) {
      //   const studentUser = await User.query()
      //     .where('user_id', request.param('id'))
      //     .preload('student')
      //   studentUser[0].email = email
      //   await studentUser[0].save()
      // }
      // if (advisorFullName) {
      //   const advisorFullNameSplit = advisorFullName.split(' ')
      //   if (advisorFullNameSplit && advisorFullNameSplit.length > 1) {
      //     const roleAdvisorUser = await User.query()
      //       .where('firstName', advisorFullNameSplit[0])
      //       .andWhere('lastName', advisorFullNameSplit[1])
      //       .andWhere('role', 'advisor')
      //     if (roleAdvisorUser && roleAdvisorUser.length > 0) {
      //       const advisorUsers = await Advisor.query().where(
      //         'advisor_id',
      //         roleAdvisorUser[0].user_id
      //       )
      //       studentUser.student.advisor_id = advisorUsers[0].advisor_id
      //       // advisorUsers[0].related('students').updateOrCreate({

      //       // })
      //       // studentUser.student.advisor_id = advisorUser[0].user_id
      //       // advisorUser[0].related('student')
      //     }
      //   }
      // }

      await studentUser.save()
      // await studentUser.student.save()
      // if (approve) {
      //   response.redirect(`/register-request`)
      // } else {
      response.redirect(`/student-information/${usersInAcademicYear[0].user_id}`)
      // }
      // response.redirect(`/student/${studentUser.user_id}/information`)
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async showStudentInfo({ auth, request, response, view }: HttpContextContract) {
    try {
      let years: any
      if (auth.user?.role === 'student') {
        years = await AcademicYear.query().orderBy('updated_at', 'desc')
      } else {
        // AcademicYearCf = await AcademicYear.query().where('academic_year', request.cookie('year'))
        if (request.cookie('year')) {
          years = await AcademicYear.query().where('academic_year', request.cookie('year'))
        } else {
          years = await AcademicYear.query().orderBy('updated_at', 'desc')
        }
      }
      let studentUser: any
      let usersInAcademicYear: any
      const studentUsersRole = await User.query()
        .where('role', 'student')
        .andWhere('user_id', request.param('id'))
      // .preload('student')
      // const studentUser = studentUsers[0]

      if (studentUsersRole[0]) {
        usersInAcademicYear = await UsersInAcademicYearModel.query()
          .where('user_id', studentUsersRole[0].user_id)
          .andWhere('academic_year', years[0].academic_year)
          .preload('student')
        // console.log(usersInAcademicYear)

        if (usersInAcademicYear[0]) {
          const stSerialize = studentUsersRole[0].serialize()
          stSerialize['student'] = usersInAcademicYear[0].student
          studentUser = stSerialize
        }
      }
      // if (studentUser.student.advisor_id) {
      //   const advisor = await User.findOrFail(studentUser.student.advisor_id)
      //   studentUser.student['advisorFullName'] = advisor.firstname + ' ' + advisor.lastname
      // }
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

  public async showStudentInfoEdit({ auth, request, response, view }: HttpContextContract) {
    try {
      let years: any
      if (auth.user?.role === 'student') {
        years = await AcademicYear.query().orderBy('updated_at', 'desc')
      } else {
        // AcademicYearCf = await AcademicYear.query().where('academic_year', request.cookie('year'))
        if (request.cookie('year')) {
          years = await AcademicYear.query().where('academic_year', request.cookie('year'))
        } else {
          years = await AcademicYear.query().orderBy('updated_at', 'desc')
        }
      }
      let studentUser: any
      let usersInAcademicYear: any
      const studentUsersRole = await User.query()
        .where('role', 'student')
        .andWhere('user_id', request.param('id'))
      // .preload('student')
      // const studentUser = studentUsers[0]

      if (studentUsersRole[0]) {
        usersInAcademicYear = await UsersInAcademicYearModel.query()
          .where('user_id', studentUsersRole[0].user_id)
          .andWhere('academic_year', years[0].academic_year)
          .preload('student')
        // console.log(usersInAcademicYear)

        if (usersInAcademicYear[0]) {
          const stSerialize = studentUsersRole[0].serialize()
          stSerialize['student'] = usersInAcademicYear[0].student
          studentUser = stSerialize
        }
      }
      // if (studentUser.student.advisor_id) {
      //   const advisor = await User.findOrFail(studentUser.student.advisor_id)
      //   studentUser.student['advisorFullName'] = advisor.firstname + ' ' + advisor.lastname
      // }
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
      let year: any
      const users = await User.all()
      if (users && users.length === 0) {
        const currentYear = await AcademicYear.query().orderBy('updated_at', 'desc')
        if (!currentYear || currentYear.length === 0) {
          year = await AcademicYear.create({
            academic_year: new Date().getFullYear(),
            status: true,
          })
        } else {
          year = currentYear[0]
        }
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
        await File.create({
          file_id: 'TR-01DEF',
          file_name: 'TR-01DEF.pdf',
          file_size: '200.06 KB',
        })

        await File.create({
          file_id: 'TR-02DEF',
          file_name: 'TR-02DEF.pdf',
          file_size: '200.06 KB',
        })
      }

      return year
    } catch (error) {
      console.log(error)
    }
  }
}
