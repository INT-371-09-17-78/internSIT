import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'
import Student from 'App/Models/Student'
import Status from 'App/Models/Status'
import File from 'App/Models/File'
import Document from 'App/Models/Document'
import Document_Status from 'App/Models/DocumentStatus'
import AcademicYearConfig from 'App/Models/AcademicYearConfig'
// import Adviser from 'App/Models/Adviser'
// import Staff from 'App/Models/Staff'
import LdapAuth from 'ldapauth-fork'
import moment from 'moment-timezone'
import Mail from '@ioc:Adonis/Addons/Mail'
import { DateTime } from 'luxon'

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
  public async register({ request, response, session }: HttpContextContract) {
    try {
      let { userId, email } = request.all()
      const uniEmailFormat = '@mail.kmutt.ac.th'
      const regxEmail =
        /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      if (!email) throw new Error('empty email')
      if (email.includes(uniEmailFormat)) {
        if (!regxEmail.test(email)) {
          throw new Error('bad email format')
        }
      } else {
        email += uniEmailFormat
      }
      if (!userId) {
        throw new Error('empty userId')
      }
      if (userId.length < 11) {
        throw new Error('bad userId length')
      }
      let user: any
      let student: any
      user = await User.findBy('user_id', userId)

      const year = await AcademicYearConfig.query().orderBy('updated_at', 'desc')

      // if (!user) {
      //   year[0].related('users').create({
      //     user_id: userId,
      //     email: email,
      //   })
      // }

      if (!user) {
        user = new User()
        user.user_id = userId
        user.email = email
        user.academic_year = year[0]
        await user.save()
      }

      if (user && user.role === 'student') {
        student = await Student.findBy('student_id', userId)
        if (!student) {
          await user?.related('student').create({})
        }
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

      return response.redirect('/success-regis')
    } catch (error) {
      session.flash({
        error: error.message,
        type: 'negative',
      })
      return response.redirect('/register')
    }
  }

  public async verify({ auth, request, response, session }: HttpContextContract) {
    try {
      const { username, password, isRemember } = request.all()

      let rememberMe: boolean = isRemember && isRemember === 'yes' ? true : false
      let user: any
      user = await User.findBy('user_id', username)
      if (!user) {
        throw new Error('cannot find user')
      }

      let ldRole: string = user.role === 'adviser' || user.role === 'staff' ? 'staff' : 'st'

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
      if (username.length < 11) {
        throw new Error('bad userName length')
      }
      // const resultTest = await st?.related('documentsStatuses').create({
      //   // no_approve_reason: 'test',$
      // })
      let rememberMe: boolean = isRemember && isRemember === 'yes' ? true : false
      let user: any
      user = await User.findBy('user_id', username)
      const year = await AcademicYearConfig.query().orderBy('updated_at', 'desc')
      if (user && user.role === 'student') {
        // const st = await Student.findBy('student_id', user.user_id)
        // if (st) {
        if (user.approved) {
          await auth.attempt(username, password, rememberMe)
          return response.redirect(`/student/${user.user_id}`) //student ที่ approved แล้ว
        } else {
          return response.redirect('/success-regis') //student ที่ยังไม่ approved
        }
        // }
      } else if (user && user.role !== 'student') {
        await auth.attempt(username, password, rememberMe) //staff เข้าได้เลยรึปะ
        if (year) {
          return response.redirect().withQs({ month: 2 }).toPath('/student-information')
        }
        return response.redirect('/course-info/edit')
      } else {
        const ldapUser: any = await this.authenticate(username, password, 'st') //student ที่ยังไม่มีข้อมูลใน db
        const fullname = ldapUser.cn.split(' ')
        if (ldapUser) {
          const year = await AcademicYearConfig.query().orderBy('updated_at', 'desc')
          //   .preload('users')
          // console.log(year[0].users)

          await year[0].related('users').create({
            user_id: username,
            firstname: fullname[0],
            lastname: fullname[1],
            email: ldapUser.mail,
            password: password,
          })
          // user = new User()
          // user.user_id = username
          // user.firstname = fullname[0]
          // user.lastname = fullname[1]
          // user.email = ldapUser.mail
          // user.password = password
          // await user.save()
          const st = await Student.findBy('student_id', username)
          if (!st) {
            await user?.related('student').create({})
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
      } else if (error.message === 'bad userName length') {
        session.flash({
          error: 'Bad Username length',
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
      let studentUsers: any = []
      // let stafftUsers: any = []
      // let adviserUsers: any = []

      // stafftUsers = await User.query().where('role', 'staff')
      // adviserUsers = await User.query().where('role', 'adviser')
      // const adviserUsersJSON = adviserUsers.map((post) => post.serialize())
      // console.log(adviserUsersJSON)
      const AcademicYearCf = await AcademicYearConfig.query().orderBy('updated_at', 'desc')

      let result: any = []
      studentUsers = await User.query().where('role', 'student').preload('student')
      const allAmoutSt = studentUsers.length
      const noApprove = studentUsers.filter((st) => !st.approved)
      if (request.qs().month) {
        const studentUsersPre = await User.query().where('role', 'student').preload('student')
        studentUsers = studentUsersPre.filter(
          (userPre) => userPre.student.plan === parseInt(request.qs().month)
        )
      }

      if (studentUsers && studentUsers.length > 0) {
        for (let i = 0; i < studentUsers.length; i++) {
          const documentStatuses = await studentUsers[i].student
            .related('documentsStatuses')
            .query()
            .orderBy('pivot_updated_at', 'desc')
          if (documentStatuses && documentStatuses.length > 0) {
            studentUsers[i].serialize()
            if (documentStatuses[0].status_id === 'Waiting') {
              studentUsers[i]['lastestStatus'] =
                documentStatuses[0].status_id + ' for ' + documentStatuses[0].document_id
            } else {
              studentUsers[i]['lastestStatus'] =
                documentStatuses[0].document_id + ' ' + documentStatuses[0].status_id
            }
          } else {
            studentUsers[i].serialize()
            studentUsers[i]['lastestStatus'] = `Waiting for TR-01`
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

      return view.render('student-information', {
        studentUsers:
          (studentUsers && studentUsers.length > 0 && request.qs().status) || request.qs().step
            ? result
            : studentUsers,
        // adviserUsers: adviserUsers,
        // stafftUsers: stafftUsers,
        noApprove: noApprove.length,
        allAmoutSt: allAmoutSt,
        AcademicYearConfig: AcademicYearCf[0],
      })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async updateCourseInformation({ request, response }: HttpContextContract) {
    try {
      const { AcademicYear } = request.only(['AcademicYear'])
      const AcademicYearCfResult = await AcademicYearConfig.query()
        .where('academic_year', AcademicYear)
        .orderBy('updated_at', 'desc')
      // if (AcademicYearCfResult && AcademicYearCfResult.length > 0) {
      //   AcademicYearCfResult[0].academic_year = AcademicYear
      //   AcademicYearCfResult[0].save()
      // } else {
      //   const AcademicYearCf = new AcademicYearConfig()
      //   AcademicYearCf.academic_year = AcademicYear
      //   AcademicYearCf.save()
      // }
      if (!AcademicYearCfResult || AcademicYearCfResult.length === 0) {
        const AcademicYearCf = new AcademicYearConfig()
        AcademicYearCf.academic_year = AcademicYear
        AcademicYearCf.save()
      } else {
        AcademicYearCfResult[0].updatedAt = DateTime.now()
        AcademicYearCfResult[0].save()
      }
      // else {
      //   const AcademicYearCf = new AcademicYearConfig()
      //   AcademicYearCf.academic_year = AcademicYear
      //   AcademicYearCf.save()
      // }
      // const result = await AcademicYearConfig.all()
      response.redirect(`/course-management`)
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

  public async showAdviserUser({ response }: HttpContextContract) {
    try {
      const adviserUsers = await User.query().where('role', 'adviser')
      return response.status(200).json({ adviserUsers: adviserUsers })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async showStaffUser({ response }: HttpContextContract) {
    try {
      const staffUsers = await User.query().where('role', 'staff')
      return response.status(200).json({ staffUsers: staffUsers })
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

  public async showStudentUserById({ request, response, view }: HttpContextContract) {
    try {
      // const role = request.param('role')
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
      const student = await Student.findOrFail(request.param('id'))

      const documentStatuses = await student
        .related('documentsStatuses')
        .query()
        .wherePivot('student_id', request.param('id'))
        .orderBy('pivot_updated_at', 'desc')

      if (documentStatuses && documentStatuses.length > 0) {
        const documentStatusesJsonCurrent = documentStatuses[0].toJSON()
        currentSteps['name'] = documentStatusesJsonCurrent.document_id
        currentSteps['status'] = documentStatusesJsonCurrent.status_id
        currentSteps['createAt'] = moment(documentStatusesJsonCurrent.created_at.toString())
          .tz('Asia/Bangkok')
          .format('MMMM D, YYYY h:mm A')
        currentSteps['reason'] = documentStatuses[0].$extras.pivot_no_approve_reason

        const stepIndex = steps.findIndex((word) => word.name === currentSteps['name'])
        if (stepIndex >= 0) {
          if (documentStatuses[0].status_id === 'Approved') {
            nextStep = steps[stepIndex + 1]
          } else {
            nextStep = steps[stepIndex]
          }
        }

        for (let i = 0; i < steps.length; i++) {
          for (let j = 0; j < documentStatuses.length; j++) {
            if (steps[i].name === documentStatuses[j].document_id) {
              steps[i]['status'] = documentStatuses[j].status_id
              break
            } else {
              steps[i]['status'] = ''
            }
          }
        }
      } else {
        currentSteps['name'] = steps[0].name
        currentSteps['status'] = ''
        currentSteps['createAt'] = ''
        currentSteps['reason'] = ''
        nextStep = steps[0]
      }

      //     steps[i]['createAt'] = moment(documentStatuses[j].created_at.toString())
      //       .tz('Asia/Bangkok')
      //       .format('MMMM D, YYYY h:mm A')
      //     if (documentStatuses[j].no_approve_reason) {
      //       steps[i]['reason'] = documentStatuses[j].no_approve_reason
      //         ? documentStatuses[j].no_approve_reason
      //         : ''
      //     }
      //     if (
      //       steps[i].name === documentStatuses[j].document_id
      //       // || (i === 0 && studentUser.student.plan)
      //     ) {
      //       steps[i]['result'] = true
      //       // if (i > 0) {
      //       steps[i]['status'] = documentStatuses[j].status_id
      //       // }

      //       break
      //     } else {
      //       steps[i]['result'] = false
      //     }
      //   }
      // }

      // const index = steps.map((ele) => ele.result).lastIndexOf(true)
      // if (index >= 0) {
      //   steps[index].status === 'Approved'
      //     ? ((nextStep = steps[index + 1]), (currentSteps = steps[index]))
      //     : ((nextStep = steps[index]), (currentSteps = nextStep))
      // } else {
      //   nextStep = steps[0]
      //   currentSteps = steps[0]
      //   currentSteps.status = ''
      // }
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
      })
      // return response.redirect('/announcement')
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async updateStudentUserStatus({ request, response }: HttpContextContract) {
    try {
      const { study, status, doc, reason } = request.only(['study', 'status', 'doc', 'reason'])
      const studentUser = await Student.findOrFail(request.param('id'))
      let statusResult: Status
      let docResult: Document
      if (study) {
        studentUser.plan = study
        await studentUser.save()
        await studentUser
          .related('documentsStatuses')
          .query()
          .wherePivot('student_id', studentUser.student_id)
          .delete()
        await File.query().where('user_id', studentUser.student_id).delete()
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
        await studentUser.related('documentsStatuses').attach({
          [docStat[0].id]: {
            no_approve_reason:
              reason && reason !== '' && statusResult.status_name === 'Disapproved' ? reason : null,
          },
        })
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
        const studentUsers = await User.query().where('user_id', user.id).preload('student')
        const studentUser = studentUsers[0]
        studentUser.approved = user.approve
        await studentUser.save()
      })
      // if (approve) {
      //   response.redirect(`/students/request`)
      // } else {
      //   response.redirect(`/student/${studentUser.user_id}/information`)
      // }
      // response.status(200).send('success')
      response.redirect(`/student-informationstudents`)
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
        adviserFullName,
        approve,
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
        'adviserFullName',
        'approve',
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
      studentUser.approved = approve
      // if (email) {
      //   const studentUser = await User.query()
      //     .where('user_id', request.param('id'))
      //     .preload('student')
      //   studentUser[0].email = email
      //   await studentUser[0].save()
      // }
      if (adviserFullName) {
        const adviserFullNameSplit = adviserFullName.split(' ')
        if (adviserFullNameSplit && adviserFullNameSplit.length > 1) {
          const adviserUser = await User.query()
            .where('firstName', adviserFullNameSplit[0])
            .andWhere('lastName', adviserFullNameSplit[1])
            .andWhere('role', 'adviser')
          if (adviserUser && adviserUser.length > 0) {
            studentUser.student.adviser_id = adviserUser[0].user_id
            // adviserUser[0].related('student')
          }
        }
      }

      await studentUser.save()
      await studentUser.student.save()
      if (approve) {
        response.redirect(`/register-request`)
      } else {
        response.redirect(`/student/${studentUser.user_id}/information`)
      }
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
          value: studentUser.student['adviserFullName']
            ? studentUser.student['adviserFullName']
            : '',
          key: 'adviserFullName',
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
          value: studentUser.student['adviserFullName']
            ? studentUser.student['adviserFullName']
            : '',
          key: 'adviserFullName',
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
        await User.createMany([
          {
            user_id: 'nuchanart.boo',
            role: 'staff',
            password: 'Fxig08',
            approved: true,
          },
          {
            user_id: 'sirinthip.suk',
            role: 'staff',
            password: 'Fxig08',
            approved: true,
          },
          {
            user_id: 'krant.bur',
            role: 'adviser',
            password: 'Fxig08',
            approved: true,
          },
          {
            user_id: 'manee.mun',
            role: 'adviser',
            password: 'Fxig08',
            approved: true,
          },
        ])
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
    } catch (error) {}
  }
}
