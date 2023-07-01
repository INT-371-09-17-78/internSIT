import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'
import Student from 'App/Models/Student'
import AcademicYear from 'App/Models/AcademicYear'
import UsersInAcademicYearModel from 'App/Models/UsersInAcademicYear'
import Mail from '@ioc:Adonis/Addons/Mail'
import AuthService from 'App/Services/authService'

export default class UsersController {
  public async verify({ auth, request, response, session }: HttpContextContract) {
    try {
      const { username, password, isRemember } = request.all()
      if (!username) {
        throw new Error('empty username')
      }
      const authService = new AuthService()
      let rememberMe: boolean = isRemember
      let user: any
      user = await User.findBy('user_id', username)
      const rawYears = await AcademicYear.query()
        // .where('academic_year', 'NOT LIKE', '%' + '/' + '%')
        .orderBy('updated_at', 'desc')
      const years = rawYears[0].academic_year.split('/')
      const checkExist = await UsersInAcademicYearModel.query()
        // .where('academic_year', years[0].academic_year)
        .andWhere('academic_year', 'LIKE', '%' + years[0] + '%')
        .andWhere('user_id', username)

      if (user && user.role === 'admin') {
        if (!checkExist || checkExist.length <= 0) {
          await rawYears[0].related('users').attach({ [user.user_id]: { approved: true } })
        }
        await auth.attempt(username, password, rememberMe)
        return response.redirect('/course-info/edit')
      } else if (user && user.role === 'student' && checkExist && checkExist.length > 0) {
        const st = await Student.findBy('student_id', checkExist[0].id)
        if (!st) {
          await checkExist[0]?.related('student').create({})
        }
        if (checkExist[0].approved) {
          const ldapUser: any = await authService.authenticate(username, password, 'st') //student ที่ยังไม่มีข้อมูลใน db
          if (ldapUser) {
            await auth.attempt(username, password, rememberMe)
          }
          return response.redirect(`/student-information/${user.user_id}/?step=TR-01`) //student ที่ approved แล้ว
        } else {
          return response.redirect('/success-regis') //student ที่ยังไม่ approved
        }
      } else if (user && user.role !== 'student') {
        if (!checkExist || checkExist.length <= 0) {
          throw new Error('no privacy in this academic_year')
        } else {
          const ldapUser: any = await authService.authenticate(username, password, 'staff')
          if (ldapUser) {
            await auth.attempt(username, password, rememberMe) //staff เข้าได้เลย
          }
          if (rawYears && rawYears.length > 0) {
            return response.redirect('/student-information')
          }
          return response.redirect('/course-info/edit')
        }
      } else {
        const ldapUser: any = await authService.authenticate(username, password, 'st') //student ที่ยังไม่มีข้อมูลใน db
        const fullname = ldapUser.cn.split(' ')
        if (ldapUser) {
          // const year = await AcademicYear.query().orderBy('updated_at', 'desc')

          if (user) {
            await rawYears[0].related('users').attach([user.user_id])
          } else {
            await rawYears[0].related('users').create({
              user_id: username,
              firstname: fullname[0],
              lastname: fullname[1],
              email: ldapUser.mail,
              password: password,
            })
          }

          const lastestUsers = await UsersInAcademicYearModel.query()
            .where('user_id', username)
            .andWhere('academic_year', rawYears[0].academic_year)
          const st = await Student.findBy('student_id', username)
          if (st) {
            st.plan = 0
            await st.save()
          }
          if (!st && lastestUsers && lastestUsers.length > 0) {
            await lastestUsers[0].related('student').create({})
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

  public async logout({ response, auth }: HttpContextContract) {
    await auth.logout()
    return response.redirect('/')
  }

  public async showAdvisorUser({ response }: HttpContextContract) {
    try {
      let advisorUsers: any
      advisorUsers = await User.query().where('role', 'advisor')
      return response.status(200).json({ advisorUsers: advisorUsers })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async showStaffUser({ response }: HttpContextContract) {
    try {
      let staffUsers: any
      staffUsers = await User.query().where('role', 'staff')
      return response.status(200).json({ staffUsers: staffUsers })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async getStaffUserCuurentYear({ request, response }: HttpContextContract) {
    try {
      let staffUsers: any = []
      let AcademicYearCf: any
      if (request.cookie('year')) {
        AcademicYearCf = await AcademicYear.query().where('academic_year', request.cookie('year'))
      } else {
        AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      }
      const acSplit = AcademicYearCf[0].academic_year.split('/')
      // console.log(acSplit[0], 'split')
      const users = await User.query().where('role', 'staff')
      if (users && users.length > 0) {
        for (let i = 0; i < users.length; i++) {
          const result = await UsersInAcademicYearModel.query()
            .where('user_id', users[i].user_id)
            // .andWhere('academic_year', AcademicYearCf[0].academic_year)
            .andWhere('academic_year', 'LIKE', '%' + acSplit[0] + '%')
          if (result && result.length > 0) {
            staffUsers.push(users[i].serialize())
          }
        }
      }

      return response.status(200).json({ staffUsers: staffUsers })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async getAdvisorUserCuurentYear({ request, response }: HttpContextContract) {
    try {
      let advisorUsers: any = []
      let AcademicYearCf: any
      if (request.cookie('year')) {
        AcademicYearCf = await AcademicYear.query().where('academic_year', request.cookie('year'))
      } else {
        AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      }

      const acSplit = AcademicYearCf[0].academic_year.split('/')
      // console.log(acSplit[0], 'split')
      const users = await User.query().where('role', 'advisor')
      if (users && users.length > 0) {
        for (let i = 0; i < users.length; i++) {
          const result = await UsersInAcademicYearModel.query()
            .where('user_id', users[i].user_id)
            // .andWhere('academic_year', AcademicYearCf[0].academic_year)
            .andWhere('academic_year', 'LIKE', '%' + acSplit[0] + '%')
          if (result && result.length > 0) {
            advisorUsers.push(users[i].serialize())
          }
        }
      }

      return response.status(200).json({ advisorUsers: advisorUsers })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async getStudentUserCuurentYear({ request, response }: HttpContextContract) {
    try {
      let studentUsers: any = []
      let AcademicYearCf: any
      if (request.cookie('year')) {
        AcademicYearCf = await AcademicYear.query().where('academic_year', request.cookie('year'))
      } else {
        AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      }
      const acSplit = AcademicYearCf[0].academic_year.split('/')
      // console.log(acSplit[0], 'split')
      const users = await User.query().where('role', 'student')
      if (users && users.length > 0) {
        for (let i = 0; i < users.length; i++) {
          const result = await UsersInAcademicYearModel.query()
            .where('user_id', users[i].user_id)
            .andWhere('approved', true)
            // .andWhere('academic_year', AcademicYearCf[0].academic_year)
            .andWhere('academic_year', 'LIKE', '%' + acSplit[0] + '%')
          if (result && result.length > 0) {
            // result
            studentUsers.push(users[i].serialize())
          }
        }
      }
      // console.log(studentUsers)

      return response.status(200).json({ studentUsers: studentUsers })
    } catch (error) {
      return response.status(400).json({ message: error.message })
    }
  }

  public async getStudentUserByAdvisor({ request, response }: HttpContextContract) {
    try {
      const advisor = request.param('id')
      let studentUsers: any = []
      let AcademicYearCf: any
      if (request.cookie('year')) {
        AcademicYearCf = await AcademicYear.query().where('academic_year', request.cookie('year'))
      } else {
        AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      }
      const acSplit = AcademicYearCf[0].academic_year.split('/')
      const users = await User.query().where('role', 'student')
      const adv = await UsersInAcademicYearModel.query()
        .where('user_id', advisor)
        .andWhere('academic_year', acSplit[0])
      for (let i = 0; i < users.length; i++) {
        const result = await UsersInAcademicYearModel.query()
          .where('user_id', users[i].user_id)
          // .andWhere('academic_year', AcademicYearCf[0].academic_year)
          .andWhere('academic_year', 'LIKE', '%' + acSplit[0] + '%')
          .andWhere('advisor_ac_id', adv[0].id)
        if (result && result.length > 0) {
          studentUsers.push(result[0])
        }
      }
      // console.log(studentUsers)

      return response.status(200).json({ studentUsers: studentUsers })
    } catch (error) {
      console.log(error)

      return response.status(400).json({ message: error.message })
    }
  }

  public async delUsersInAcademicYear({ request, response }: HttpContextContract) {
    try {
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
      const userId = request.param('id')
      const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      const acSplit = AcademicYearCf[0].academic_year.split('/')
      // const rawYears = await AcademicYear.query()
      //   // .where('academic_year', 'NOT LIKE', '%' + '/' + '%')
      //   .orderBy('updated_at', 'desc')
      const delUser = await UsersInAcademicYearModel.query()
        // .where('academic_year', AcademicYearCf[0].academic_year)
        .where('academic_year', 'LIKE', '%' + acSplit[0] + '%')
        .andWhere('user_id', userId)
      // const tmpSt = await Student.query().where('student_id', delUser[0].id)
      // const newSt = new Student()
      // newSt.

      // if (user) {
      //   await rawYears[0].related('users').attach([user.user_id])
      // } else {
      // const lastestUsers = await UsersInAcademicYearModel.query()
      //   .where('user_id', username)
      //   .andWhere('academic_year', rawYears[0].academic_year)

      // }
      const newTmp = new UsersInAcademicYearModel()
      newTmp.academic_year = delUser[0].academic_year
      newTmp.user_id = delUser[0].user_id
      newTmp.approved = delUser[0].approved

      await delUser[0].delete()
      // const st = await Student.findBy('student_id', delUser[0].user_id)
      // if (st) {
      //   st.plan = 0
      //   await st.save()
      // }
      // if (!st && delUser && delUser.length > 0) {
      //   await delUser[0].related('student').create({})
      // }
      await newTmp.save()

      const lastestUsers = await UsersInAcademicYearModel.query()
        .where('user_id', delUser[0].user_id)
        .andWhere('academic_year', delUser[0].academic_year)
      if (lastestUsers && lastestUsers.length > 0) {
        await lastestUsers[0].related('student').create({})
      }
      // delUser[0].advisor_ac_id = null
      // await delUser[0].save()
      return response.status(200).json('success')
    } catch (error) {
      console.log(error)
      return response.status(400).json({ message: error.message })
    }
  }

  public async deleteStudentUser({ request, response }: HttpContextContract) {
    try {
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
}
