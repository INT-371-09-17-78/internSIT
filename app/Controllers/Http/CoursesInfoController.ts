import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'
// import Student from 'App/Models/Student'
// import File from 'App/Models/File'
import { AllSteps } from 'Contracts/enum'
import AcademicYear from 'App/Models/AcademicYear'
// import UserHasDoc from 'App/Models/UserHasDoc'
import UsersInAcademicYearModel from 'App/Models/UsersInAcademicYear'
// import LdapAuth from 'ldapauth-fork'
// import moment from 'moment-timezone'
import Mail from '@ioc:Adonis/Addons/Mail'
import Staff from 'App/Models/Staff'
import Advisor from 'App/Models/Advisor'
// import stepService from 'App/Services/stepServices'

export default class CoursesInfoController {
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

      response.cookie('year', year)
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async updateUsersCourseInformation({ request, response }: HttpContextContract) {
    try {
      const { users } = request.all()
      let AcademicYearCfResult: any
      AcademicYearCfResult = await AcademicYear.query().orderBy('updated_at', 'desc')
      if (
        (users.advisors && users.advisors.length > 0) ||
        (users.staffs && users.staffs.length > 0)
      ) {
        const newUser = users.advisors.concat(users.staffs)

        for (let i = 0; i < newUser.length; i++) {
          let user: any
          if (newUser[i]) {
            user = await User.find(newUser[i])
          }
          if (user) {
            await AcademicYearCfResult[0]
              .related('users')
              .attach({ [user.user_id]: { approved: true } })

            const acCfRe = await UsersInAcademicYearModel.query().orderBy('created_at', 'desc')
            if (acCfRe && acCfRe.length > 0) {
              if (user.role === 'staff') {
                await Staff.create({ staff_id: acCfRe[0].id })
              } else {
                await Advisor.create({ advisor_id: acCfRe[0].id })
              }
            }

            // await Mail.use('smtp').send((message) => {
            //   message
            //     .from('iunnuidev2@gmail.com')
            //     .to('iunnuidev2@gmail.com')
            //     .subject('Granted account')
            //     .htmlView('emails/confirmStaff')
            // })
          }
        }

        return response.status(200).json('success')
      }
    } catch (error) {
      console.log(error)
      return response.status(400).json({ message: error.message })
    }
  }

  public async updateAdvisorHasStudent({ request, response }: HttpContextContract) {
    try {
      const { students, advisor } = request.all()

      let AcademicYearCfResult: any
      AcademicYearCfResult = await AcademicYear.query().orderBy('updated_at', 'desc')
      const advisorResult = await User.query()
        .where('role', 'advisor')
        .andWhere('user_id', advisor.advisor_id)

      if (advisorResult[0] && students && students.length > 0) {
        const AdvisorInAcademicYear = await UsersInAcademicYearModel.query()
          .where('user_id', advisorResult[0].user_id)
          .andWhere('academic_year', AcademicYearCfResult[0].academic_year)

        for (let i = 0; i < students.length; i++) {
          const usi = await UsersInAcademicYearModel.query()
            .where('user_id', students[i])
            .andWhere('academic_year', AcademicYearCfResult[0].academic_year)
          usi[0].advisor_ac_id = AdvisorInAcademicYear[0].id
          await usi[0].save()
        }
      }
    } catch (error) {
      console.log(error)
      return response.status(400).json({ message: error.message })
    }
  }

  public async updateSupervisionStatus({ request, response }: HttpContextContract) {
    try {
      const { step, supervisionStatus } = request.only(['step', 'supervisionStatus'])
      let supervision
      let usersInAcademicYear: any

      const years = await AcademicYear.query().orderBy('updated_at', 'desc')
      const studentUsersRole = await User.query()
        .where('role', 'student')
        .andWhere('user_id', request.param('id'))
      if (studentUsersRole[0]) {
        usersInAcademicYear = await UsersInAcademicYearModel.query()
          .where('user_id', studentUsersRole[0].user_id)
          .andWhere('academic_year', years[0].academic_year)
          .preload('student')
      }
      if ((step && step.includes('TR-03 and TR-05')) || step.includes('TR-02')) {
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
        if (supervisionStatus) {
          supervision[0].supervision_status = supervisionStatus
        }
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
      const studentUsers = await User.query().where('user_id', request.param('id'))
      const studentUser = studentUsers[0]
      response.redirect(`/student/${studentUser.user_id}`)
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async updateStudentUserInfo({ request, response }: HttpContextContract) {
    try {
      const {
        firm,
        // email,
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

      if (studentUsersRole[0]) {
        usersInAcademicYear = await UsersInAcademicYearModel.query()
          .where('user_id', studentUsersRole[0].user_id)
          .andWhere('academic_year', years[0].academic_year)
          .preload('student')

        if (usersInAcademicYear[0]) {
          studentUser = usersInAcademicYear[0].student
        }
      }

      studentUser.firm = firm
      studentUser.tel = tel
      studentUser.department = department
      studentUser.position = position
      studentUser.plan = duration
      studentUser.mentor_name = mentor
      studentUser.mentor_position = mentorPosition
      studentUser.mentor_email = mentorEmail
      studentUser.mentor_tel_no = mentorTel

      await studentUser.save()

      response.redirect(`/student-information/${usersInAcademicYear[0].user_id}`)
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

      if (studentUsersRole[0]) {
        usersInAcademicYear = await UsersInAcademicYearModel.query()
          .where('user_id', studentUsersRole[0].user_id)
          .andWhere('academic_year', years[0].academic_year)
          .preload('student')

        if (usersInAcademicYear[0]) {
          const stSerialize = studentUsersRole[0].serialize()
          stSerialize['student'] = usersInAcademicYear[0].student
          studentUser = stSerialize
        }
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

  public async showStudentInfoEdit({ auth, request, response, view }: HttpContextContract) {
    try {
      let years: any
      if (auth.user?.role === 'student') {
        years = await AcademicYear.query().orderBy('updated_at', 'desc')
      } else {
        if (request.cookie('year')) {
          years = await AcademicYear.query().where('academic_year', request.cookie('year'))
        } else {
          years = await AcademicYear.query().orderBy('updated_at', 'desc')
        }
      }
      let studentUser: any
      let usersInAcademicYear: any
      let avisorSt: any
      const studentUsersRole = await User.query()
        .where('role', 'student')
        .andWhere('user_id', request.param('id'))

      if (studentUsersRole[0]) {
        usersInAcademicYear = await UsersInAcademicYearModel.query()
          .where('user_id', studentUsersRole[0].user_id)
          .andWhere('academic_year', years[0].academic_year)
          .preload('student')

        if (usersInAcademicYear[0]) {
          const stSerialize = studentUsersRole[0].serialize()
          stSerialize['student'] = usersInAcademicYear[0].student
          stSerialize['studentAc'] = usersInAcademicYear[0]
          studentUser = stSerialize
        }

        if (studentUser['studentAc']['advisor_ac_id']) {
          const ac = await UsersInAcademicYearModel.query().where(
            'id',
            studentUser['studentAc']['advisor_ac_id']
          )
          if (ac && ac.length > 0) {
            const result = await User.query().where('user_id', ac[0].user_id)
            result && result.length > 0 ? (avisorSt = result) : undefined
          }
        }
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
          value: avisorSt[0] ? avisorSt[0].firstname + ' ' + avisorSt[0].lastname : '',
          key: 'advisorFullName',
        },
      ]
      return view.render('edit-student', { studentUser, disabled, studentInfo })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async completeCourse({ request, response }: HttpContextContract) {
    try {
      // const { academicYear } = request.only['academic_year']
      const academicYear = request.param('id')
      console.log(academicYear)

      const ac = await AcademicYear.query().where('academic_year', academicYear)
      if (ac && ac.length > 0) {
        ac[0].status = false
        ac[0].save()
        return response.status(200).json('success')
      }
      return response.status(400).json({ message: 'cant update academic year' })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }
}
