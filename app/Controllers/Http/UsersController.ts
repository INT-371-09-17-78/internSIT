import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'
import Student from 'App/Models/Student'
import Status from 'App/Models/Status'
import Document from 'App/Models/Document'
import Document_Status from 'App/Models/DocumentStatus'
// import Adviser from 'App/Models/Adviser'
// import Staff from 'App/Models/Staff'
import LdapAuth from 'ldapauth-fork'

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
  // public async show({ params }: HttpContextContract) {
  //   return await User.find(params.id)
  // }
  public async verify({ auth, request, response, session }: HttpContextContract) {
    try {
      const { username, password, isRemember, role } = request.all()

      if (!role) {
        throw new Error('empty role')
      }

      let rememberMe: boolean = isRemember && isRemember === 'yes' ? true : false
      let ldRole: string = role === 'adviser' || role === 'staff' ? 'staff' : 'st'
      let user: any
      let student: any

      if (username === 'admin') {
        await auth.attempt(username, password, rememberMe)
        return response.redirect('/announcement')
      } else {
        const ldapUser: any = await this.authenticate(username, password, ldRole)
        const fullname = ldapUser.cn.split(' ')
        if (ldapUser) {
          user = await User.findBy('user_id', username)
          if (!user) {
            user = new User()
            user.user_id = ldapUser.uid
            user.firstname = fullname[0]
            user.lastname = fullname[1]
            user.email = ldapUser.mail
            user.password = password
            user.role = role
            await user.save()
          }

          await auth.use('web').login(user, rememberMe)
          if (user && ldRole === 'st') {
            student = await Student.findBy('student_id', ldapUser.uid)
            if (!student) {
              await user?.related('student').create({})
            }
          }

          return response.redirect('/announcement')
        }
      }
    } catch (error) {
      // console.log(error.message)
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

  public async showStudentUser({ request, response, view }: HttpContextContract) {
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
            : (studentUser[i]['lastestStatus'] = 'ยังไม่ได้เลือก plan')
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
        // studentUser.student.plan === 6
        //   ?
        [
          {
            steps: 'Accepted by firm',
            result: false,
          },
          {
            steps: 'TR-01',
            result: false,
          },
          {
            steps: 'TR-02',
            result: false,
          },
          {
            steps: 'TR-03 and TR-05 (1/6)',
            result: false,
          },
          {
            steps: 'Informed supervision (1/6)',
            result: false,
          },
          {
            steps: 'TR-03 and TR-05 (2/6)',
            result: false,
          },
          {
            steps: 'Informed supervision (2/6)',
            result: false,
          },
          {
            steps: 'TR-03 and TR-05 (3/6)',
            result: false,
          },
          {
            steps: 'Informed supervision (3/6)',
            result: false,
          },
          {
            steps: 'TR-03 and TR-05 (4/6)',
            result: false,
          },
          {
            steps: 'Informed supervision (4/6)',
            result: false,
          },
          {
            steps: 'TR-03 and TR-05 (5/6)',
            result: false,
          },
          {
            steps: 'Informed supervision (5/6)',
            result: false,
          },
        ]
      // :
      // ? {
      //     steps: [
      //       'Accepted by firm',
      //       'TR-01',
      //       'TR-02',
      //       'TR-03 and TR-05 (1/6)',
      //       'Informed supervision (1/6) ',
      //       'TR-03 and TR-05 (2/6)',
      //       'Informed supervision (2/6)',
      //       'TR-03 and TR-05 (3/6)',
      //       'Informed supervision (3/6)',
      //       'TR-03 and TR-05 (4/6)',
      //       'Informed supervision (4/6)',
      //       'TR-03 and TR-05 (5/6)',
      //       'Informed supervision (5/6)',
      //       'Sent Presentation',
      //       'Presentation',
      //       'TR-03 and TR-06 (6/6)',
      //     ],
      //     testResult: [],
      //   }
      // {
      //   steps: [
      //     'Accepted by firm',
      //     'TR-01',
      //     'TR-02',
      //     'TR-03 and TR-05 (1/4)',
      //     'Informed supervision (1/4) ',
      //     'TR-03 and TR-05 (2/4)',
      //     'Informed supervision (2/4)',
      //     'TR-03 and TR-05 (3/4)',
      //     'Informed supervision (3/4)',
      //     'Sent Presentation',
      //     'Presentation',
      //     'TR-03 and TR-06 (4/4)',
      //   ],
      //   testResult: [],
      // }
      let nextStep: any
      let currentSteps: any
      const disabled = studentUser.student.plan === null ? '' : 'disabled'
      // if (studentUser.student.status === 'ยังไม่ได้เลือก') {
      //   disabled = 'disabled'
      // }
      const student = await Student.findOrFail(request.param('id'))
      // studentUser.related('')
      const documentStatuses = await student
        .related('document_status')
        .query()
        .where('student_id', request.param('id'))
      // console.log(documentStatus)
      // return response.send(documentStatus)
      // let testResult: string[] = []

      for (let i = 0; i < steps.length; i++) {
        // console.log(steps[i].steps)
        for (let j = 0; j < documentStatuses.length; j++) {
          // console.log(steps[i].steps)
          //   console.log(documentStatuses[j].document_id)
          // steps[i] === documentStatuses[j].document_id
          //   ? (return testResult[i] = true )
          //   : (testResult[i] = false)
          if (
            steps[i].steps === documentStatuses[j].document_id ||
            (i === 0 && studentUser.student.plan)
          ) {
            // console.log('เข้าอันนี้')
            steps[i].result = true
            // nextStep = steps[i]
            if (i > 0) {
              // console.log('เข้า')
              steps[i]['status'] = documentStatuses[j].status_id
              // documentStatuses[j].status_id === 'Approve'
              //   ? (nextStep = steps[i + 1])
              //   : (nextStep = steps[i])
            }

            break
          } else {
            steps[i].result = false
          }
        }
      }
      const index = steps.map((ele) => ele.result).lastIndexOf(true)
      if (index > 0) {
        steps[index].status === 'Approve'
          ? ((nextStep = steps[index + 1]), (currentSteps = steps[index]))
          : ((nextStep = steps[index]), (currentSteps = nextStep))
      } else {
        nextStep = steps[1]
        currentSteps = steps[0]
        currentSteps.status = ''
      }
      console.log(currentSteps)

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
      const { study, status, doc } = request.only(['study', 'status', 'doc'])
      console.log(doc)
      const studentUser = await Student.findOrFail(request.param('id'))
      let statusResult: Status
      let docResult: Document
      if (study) {
        studentUser.plan = study
        await studentUser.save()
      }
      if (status && doc) {
        statusResult = await Status.findOrFail(status)
        docResult = await Document.findOrFail(doc)

        // console.log(studentUser);

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
        // console.log(docStat)

        if (docStat && docStat.length > 0) {
          await studentUser
            .related('document_status')
            .query()
            .where('student_id', studentUser.student_id)
            .andWhere('document_id', docResult.doc_name)
            .update({ status_id: statusResult.status_name })
        } else {
          await studentUser.related('document_status').create({
            student_id: studentUser.student_id,
            document_id: docResult.doc_name,
            status_id: statusResult.status_name,
          })
        }
      }
      // console.log(result)

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
        menter,
        menterPosition,
        menterEmail,
        menterTel,
        adviserFirstName,
        adviserLastName,
      } = request.only([
        'firm',
        'email',
        'tel',
        'department',
        'position',
        'duration',
        'menter',
        'menterPosition',
        'menterEmail',
        'menterTel',
        'adviserFirstName',
        'adviserLastName',
      ])
      const studentUsers = await User.query()
        .where('user_id', request.param('id'))
        .preload('student')
      const studentUser = studentUsers[0]
      // const studentUser = await Student.findOrFail(request.param('id'))
      studentUser.student.company = firm
      studentUser.student.tel = tel
      studentUser.student.department = department
      studentUser.student.position = position
      studentUser.student.plan = duration
      studentUser.student.mentor_name = menter
      studentUser.student.mentor_position = menterPosition
      studentUser.student.mentor_email = menterEmail
      studentUser.student.mentor_tel_no = menterTel
      studentUser.email = email
      // if (email) {
      //   const studentUser = await User.query()
      //     .where('user_id', request.param('id'))
      //     .preload('student')
      //   studentUser[0].email = email
      //   await studentUser[0].save()
      // }
      const adviserUser = await User.query()
        .where('firstName', adviserFirstName)
        .andWhere('lastName', adviserLastName)
        .andWhere('role', 'adviser')
      if (adviserUser && adviserUser.length > 0) {
        studentUser.student.adviser_id = adviserUser[0].user_id
        // adviserUser[0].related('student')
      }
      await studentUser.save()
      await studentUser.student.save()
      response.status(200).json('update success')
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async test({ request, response }: HttpContextContract) {
    try {
      await Document.create({
        doc_name: 'test1',
      })
      await Status.create({
        status_name: 'test2',
      })
      const student = await Student.find('65130000001')
      console.log(student)
      if (student) {
        const result = student.related('document_status').create({
          document_id: 'test1',
          status_id: 'test2',
        })
        return response.status(200).json({ 1: result })
      }
      // const result = Document
      // const document = await Document.find('test1')
      // const status = await Status.find('test2')

      // let result = []
      // if (status && document) {
      //   //   await document?.related('statuses').attach([status.status_name])
      //   const result = await document.related('statuses').query().where('status_id', 'test2')
      //   return response.status(200).json({ 1: result })
      // }

      // const result = await Document_Status.find('test2')
      // const terst = await Document.query().where('doc_name', 'test2')
      // terst.statuses()

      // const { study, status } = request.only(['study', 'status'])
      // console.log(status)
      // console.log(study)
      // const studentUser = await Student.findOrFail(request.param('id'))
      // studentUser.status = 'เลือกแล้วครับ'
      // studentUser.study = study
      // const result = await studentUser.save()
      // response.redirect('/student/' + result.student_id)
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async gen() {
    try {
      await Document.createMany([
        {
          doc_name: 'TR-01',
        },
        {
          doc_name: 'TR-02',
        },
        {
          doc_name: 'TR-03 and TR-05',
        },
        {
          doc_name: 'selectPlan',
        },
      ])
      await Status.createMany([
        {
          status_name: 'Pending',
        },
        {
          status_name: 'Not Approve',
        },
        {
          status_name: 'Approve',
        },
        {
          status_name: 'not select plan yet',
        },
        {
          status_name: 'selected plan',
        },
      ])
      // next()
    } catch (error) {
      // console.log(error)
      // return response.status(400).json({ message: error.message })
    }
  }
}
