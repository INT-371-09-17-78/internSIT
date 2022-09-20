import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'
import Student from 'App/Models/Student'
import Status from 'App/Models/Status'
import File from 'App/Models/File'
import Document from 'App/Models/Document'
import Document_Status from 'App/Models/DocumentStatus'
// import Adviser from 'App/Models/Adviser'
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
  public async register({ request, response, session }: HttpContextContract) {
    try {
      let { userId, email } = request.all()
      const uniEmailFormat = '@mail.kmutt.ac.th'
      const regxEmail =
        /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      console.log(regxEmail.test(email))
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

      if (!user) {
        user = new User()
        user.user_id = userId
        user.email = email
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
      return response.redirect('/announcement')
    } catch (error) {
      console.log(error)
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

  public async showStudentUser({ response, view }: HttpContextContract) {
    try {
      // const role = request.param('role')
      // const studentUser = await Student.query().preload('document_status')
      const studentUser = await User.query()
        .where('role', 'student')
        // .andWhere('user_id', request.param('id'))
        .preload('student')
      for (let i = 0; i < studentUser.length; i++) {
        const documentStatus = await Document_Status.query()
          .where('student_id', studentUser[i].user_id)
          .orderBy('updated_at', 'desc')
        if (documentStatus && documentStatus.length > 0) {
          console.log('เข้า')
          studentUser[i].serialize()
          studentUser[i]['lastestStatus'] =
            documentStatus[0].document_id + ' ' + documentStatus[0].status_id
        } else {
          studentUser[i].serialize()
          studentUser[i].student.plan
            ? (studentUser[i]['lastestStatus'] = 'Accepted by firm')
            : (studentUser[i]['lastestStatus'] = `Haven't chosen a plan yet.`)
        }
        // console.log(documentStatus)

        // studentUser[i].toJSON()
        // studentUser[i]['lastestStatus'] = documentStatus[0].document_id
      }

      // const document_status = await Document_Status.query().where('student_id')
      // return response.status(200).json(result)
      // console.log(studentUser)
      // const result = await document.related('statuses').query().where('status_id', 'test2')
      // return response.send(studentUser)
      return view.render('students', { studentUser })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
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
                name: 'Accepted by firm',
              },
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
                name: 'Accepted by firm',
              },
              {
                name: 'TR-01',
              },
              {
                name: 'TR-02',
              },
              {
                name: 'TR-03 and TR-05 (1/4)',
              },
              {
                name: 'Informed supervision (1/4)',
              },
              {
                name: 'TR-03 and TR-05 (2/4)',
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
                name: 'Accepted by firm',
              },
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
      let currentSteps: any
      const disabled = studentUser.student.plan === null ? '' : 'disabled'
      const student = await Student.findOrFail(request.param('id'))

      const documentStatuses = await student
        .related('document_status')
        .query()
        .where('student_id', request.param('id'))

      for (let i = 0; i < steps.length; i++) {
        for (let j = 0; j < documentStatuses.length; j++) {
          steps[i]['createAt'] = moment(documentStatuses[j].created_at.toString())
            .tz('Asia/Bangkok')
            .format('MMMM D, YYYY h:mm A')
          if (documentStatuses[j].no_approve_reason) {
            steps[i]['reason'] = documentStatuses[j].no_approve_reason
              ? documentStatuses[j].no_approve_reason
              : ''
          }
          if (
            steps[i].name === documentStatuses[j].document_id
            // || (i === 0 && studentUser.student.plan)
          ) {
            steps[i]['result'] = true
            // if (i > 0) {
            steps[i]['status'] = documentStatuses[j].status_id
            // }

            break
          } else {
            steps[i]['result'] = false
          }
        }
      }

      const index = steps.map((ele) => ele.result).lastIndexOf(true)
      console.log(index)
      if (index >= 0) {
        if (steps[index].status === 'Approved') {
          console.log('asdasd')
        }
        steps[index].status === 'Approved'
          ? ((nextStep = steps[index + 1]), (currentSteps = steps[index]))
          : ((nextStep = steps[index]), (currentSteps = nextStep))
      } else {
        nextStep = steps[0]
        currentSteps = steps[0]
        currentSteps.status = ''
      }
      console.log(currentSteps)
      console.log(nextStep)

      return view.render('student', {
        studentUser,
        plans,
        disabled,
        steps,
        nextStep,
        currentSteps,
        studentInfo,
      })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async updateStudentUserStatus({ request, response }: HttpContextContract) {
    try {
      const { study, status, doc, reason } = request.only(['study', 'status', 'doc', 'reason'])
      console.log(doc)
      const studentUser = await Student.findOrFail(request.param('id'))
      let statusResult: Status
      let docResult: Document
      if (study) {
        studentUser.plan = study
        await studentUser.save()
        await Document_Status.query().where('student_id', studentUser.student_id).delete()
        await File.query().where('user_id', studentUser.student_id).delete()
      }
      // if (status && doc) {
      statusResult = await Status.findOrFail(status || 'Pending')
      docResult = await Document.findOrFail(doc || 'Accepted by firm')

      const docStat = await Document_Status.query()
        .where('student_id', studentUser.student_id)
        .andWhere('document_id', docResult.doc_name)
        .orderBy('updated_at', 'desc')
      // await studentUser.related('document_status').updateOrCreate(
      //   { student_id: studentUser.student_id },
      //   {
      //     document_id: docResult.doc_name,
      //     status_id: statusResult.status_name,
      //   }
      // )

      if (docStat && docStat.length > 0) {
        await studentUser
          .related('document_status')
          .query()
          .where('student_id', studentUser.student_id)
          .andWhere('document_id', docResult.doc_name)
          .update({
            status_id: statusResult.status_name,
            no_approve_reason:
              reason && reason !== '' && statusResult.status_name === 'Disapproved' ? reason : null,
          })
      } else {
        await studentUser.related('document_status').create({
          student_id: studentUser.student_id,
          document_id: docResult.doc_name,
          status_id: statusResult.status_name,
          // no_approve_reason:
          //   reason && reason !== '' && statusResult.status_name === 'Not Approve' ? reason : null,
        })
      }
      // }

      response.redirect('/student/' + studentUser.student_id)
      // return response.status(200).json(result)
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
      // if (email) {
      //   const studentUser = await User.query()
      //     .where('user_id', request.param('id'))
      //     .preload('student')
      //   studentUser[0].email = email
      //   await studentUser[0].save()
      // }
      console.log(adviserFullName)
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
      response.redirect(`/student/${studentUser.user_id}/information`)
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async gen() {
    try {
      const docs = await Document.all()
      if (docs && docs.length === 0) {
        await Document.createMany([
          {
            doc_name: 'Accepted by firm',
          },
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
        await Status.createMany([
          {
            status_name: 'Pending',
          },
          {
            status_name: 'Disapproved',
          },
          {
            status_name: 'Approved',
          },
        ])
      }
      const users = await User.all()
      if (users && users.length === 0) {
        await User.createMany([
          {
            user_id: 'nuchanart.boo',
            role: 'staff',
          },
          {
            user_id: 'sirinthip.suk',
            role: 'staff',
          },
          {
            user_id: 'krant.bur',
            role: 'adviser',
          },
          {
            user_id: 'manee.mun',
            role: 'adviser',
          },
        ])
      }

      // next()
    } catch (error) {
      // console.log(error)
      // return response.status(400).json({ message: error.message })
    }
  }
}
