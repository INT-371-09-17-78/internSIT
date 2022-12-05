import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'
import Student from 'App/Models/Student'
import File from 'App/Models/File'
import { StepStatus, Steps4Month, Steps2Month, Steps6Month, AllSteps } from 'Contracts/enum'
import AcademicYear from 'App/Models/AcademicYear'
import UserHasDoc from 'App/Models/UserHasDoc'
import UsersInAcademicYearModel from 'App/Models/UsersInAcademicYear'
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
  public async verify({ auth, request, response, session }: HttpContextContract) {
    try {
      const { username, password, isRemember } = request.all()
      if (!username) {
        throw new Error('empty username')
      }

      let rememberMe: boolean = isRemember && isRemember === 'yes' ? true : false
      let user: any
      user = await User.findBy('user_id', username)
      const years = await AcademicYear.query().orderBy('updated_at', 'desc')
      const checkExist = await UsersInAcademicYearModel.query()
        .where('academic_year', years[0].academic_year)
        .andWhere('user_id', username)

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
      } else if (user && user.role !== 'student') {
        if (!checkExist || checkExist.length <= 0) {
          throw new Error('no privacy in this academic_year')
        } else {
          await auth.attempt(username, password, rememberMe) //staff เข้าได้เลย
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

  public async showStudentUser({ request, auth, response, view }: HttpContextContract) {
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
      let allAmoutSt: any
      let noApprove: any
      let advisorById: any = []
      let advisor: any = []
      let studentUsersByAdOne: any
      let adSe: any = []

      if (request.qs().advisor) {
        advisorById = await User.query()
          .where('user_id', request.qs().advisor)
          .andWhere('role', 'advisor')

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

          studentUsersByAdOne = tmp
        }
      } else {
        advisor = await User.query().where('role', 'advisor')

        if (advisor && advisor.length > 0) {
          for (let i = 0; i < advisor.length; i++) {
            const checkAdvisorExistInAcademicYear = await UsersInAcademicYearModel.query()
              .where('user_id', advisor[i].user_id)
              .andWhere('academic_year', AcademicYearCf[0].academic_year)
            if (checkAdvisorExistInAcademicYear && checkAdvisorExistInAcademicYear.length > 0) {
              const id = checkAdvisorExistInAcademicYear[0].id
              const result = await UsersInAcademicYearModel.query().where('advisor_ac_id', id)
              const tmp = advisor[i].serialize()
              tmp['st'] = []
              for (let j = 0; j < result.length; j++) {
                // console.log(id)

                const user = await User.query().where('user_id', result[j].user_id)
                tmp['st'].push(user[0].serialize())
              }

              adSe.push(tmp)
              // console.log(adSe)
            }
          }
          // adSe = adSe.find((ele) => ele.user_id === auth.user?.user_id)
        }
      }
      // auth.user?.user_id
      // console.log(adSe.find((ele) => ele.user_id === auth.user?.user_id))
      // console.log(auth.user?.user_id)
      // console.log(adSe)

      if (auth.user && auth.user.role === 'advisor') {
        const ad = await User.query()
          .where('role', 'advisor')
          .andWhere('user_id', auth.user.user_id)
          .preload('academicYear')
        for (let i = 0; i < ad.length; i++) {
          const checkAdvisorExistInAcademicYear = await UsersInAcademicYearModel.query()
            .where('user_id', ad[i].user_id)
            .andWhere('academic_year', AcademicYearCf[0].academic_year)

          if (checkAdvisorExistInAcademicYear && checkAdvisorExistInAcademicYear.length > 0) {
            const id = checkAdvisorExistInAcademicYear[0].id
            const result = await UsersInAcademicYearModel.query().where('advisor_ac_id', id)

            if (result && result.length > 0) {
              for (let i = 0; i < result.length; i++) {
                const students = await Student.query().where('student_id', result[i].id)
                const user = await User.query().where('user_id', result[i].user_id)

                if (user[0]) {
                  const resultSe = user[0].serialize()
                  resultSe['approved'] = result[i].approved
                  resultSe['plan'] = students[0].plan || 0
                  studentUsers.push(resultSe)
                }
              }
            }
          }
        }
        console.log(studentUsers)
      } else {
        if (AcademicYearCf && AcademicYearCf.length > 0) {
          const UsersInAcademicYear = await UsersInAcademicYearModel.query().where(
            'academic_year',
            AcademicYearCf[0].academic_year
          )
          for (let i = 0; i < UsersInAcademicYear.length; i++) {
            const result = await User.query()
              .where('role', 'student')
              .andWhere('user_id', UsersInAcademicYear[i].user_id)
            if (result[0]) {
              const resultSt = await UsersInAcademicYearModel.query()
                .where('user_id', result[0].user_id)
                .andWhere('academic_year', UsersInAcademicYear[0].academic_year)
              const students = await Student.query().where('student_id', resultSt[0].id)
              if (students[0]) {
                const resultSe = result[0].serialize()
                resultSe['approved'] = UsersInAcademicYear[i].approved
                resultSe['plan'] = students[0].plan || 0
                studentUsers.push(resultSe)
              }
            }
          }
        } else {
          studentUsers = []
        }
      }

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
          staffUsersResult.push(staffUsers[i])
        }
      }

      const AllStepByMonth = {}
      AllStepByMonth['twoMonth'] = this.showSteps(2)
      AllStepByMonth['fourMonth'] = this.showSteps(4)
      AllStepByMonth['sixMonth'] = this.showSteps(6)
      let stepEdit: any
      AllStepByMonth['twoMonth'] = await this.addTemplateFiletoStepMonth(
        AllStepByMonth['twoMonth'],
        2
      )
      AllStepByMonth['fourMonth'] = await this.addTemplateFiletoStepMonth(
        AllStepByMonth['fourMonth'],
        4
      )
      AllStepByMonth['sixMonth'] = await this.addTemplateFiletoStepMonth(
        AllStepByMonth['sixMonth'],
        6
      )
      let stepRender: any
      if (request.qs() && request.qs().month) {
        if (request.qs().month === '2') {
          stepRender = AllStepByMonth['twoMonth']
        } else if (request.qs().month === '4') {
          stepRender = AllStepByMonth['fourMonth']
        } else if (request.qs().month === '6') {
          stepRender = AllStepByMonth['sixMonth']
        }
      }

      if (request.qs() && request.qs().month && request.qs().step) {
        stepEdit = this.findStepEdit(
          request.qs().month,
          request.qs().step,
          AllStepByMonth['twoMonth'],
          AllStepByMonth['fourMonth'],
          AllStepByMonth['sixMonth']
        )
      }

      if (studentUsers && studentUsers.length > 0) {
        for (let i = 0; i < studentUsers.length; i++) {
          const usersInAcademicYear = await UsersInAcademicYearModel.query()
            .where('user_id', studentUsers[i].user_id)
            .andWhere('academic_year', AcademicYearCf[0].academic_year)

          const userHasDoc = await UserHasDoc.query()
            .where('user_in_academic_year_id', usersInAcademicYear[0].id)
            .orderBy('created_at', 'desc')

          if (stepRender && stepRender.length > 0) {
            for (let j = 0; j < stepRender.length; j++) {
              if (stepRender[j].name === AllSteps.TR03_TR05_AND_SUPERVISION) {
                for (let k = 0; k < stepRender[j].month.length; k++) {
                  for (let g = 0; g < stepRender[j].month[k].length; g++) {
                    const result = await UserHasDoc.query()
                      .where('user_in_academic_year_id', usersInAcademicYear[0].id)
                      .andWhere('step', stepRender[j].month[k][g].value)
                      .orderBy('created_at', 'desc')
                    studentUsers[i][stepRender[j].month[k][g].value] =
                      result && result.length > 0 ? result[0].serialize().status : null
                  }
                }
              } else {
                const result = await UserHasDoc.query()
                  .where('user_in_academic_year_id', usersInAcademicYear[0].id)
                  .andWhere('step', stepRender[j].name)
                  .orderBy('created_at', 'desc')
                studentUsers[i][stepRender[j].name] =
                  result && result.length > 0 ? result[0].serialize().status : null
              }
            }
          }

          if (userHasDoc && userHasDoc.length > 0) {
            if (userHasDoc[0].status === StepStatus.WAITING) {
              studentUsers[i]['lastestStatus'] = userHasDoc[0].status + ' for ' + userHasDoc[0].step
            } else {
              studentUsers[i]['lastestStatus'] = userHasDoc[0].step + ' ' + userHasDoc[0].status
            }
          } else {
            studentUsers[i]['lastestStatus'] = `No plan selected`
          }
        }
      }

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
        AllStepByMonth: AllStepByMonth,
        stepEdit: stepEdit,
        stepRender: stepRender,
      })
    } catch (error) {
      console.log(error)

      return response.status(400).json({ message: error.message })
    }
  }

  // private queryStringFilter(arr, queryString) {
  //   const result = arr.filter((word) => {
  //     if (Array.isArray(queryString)) {
  //       for (const qs of queryString) {
  //         if (word['lastestStatus'].toUpperCase().includes(qs.toUpperCase())) {
  //           return true
  //         }
  //       }
  //       return false
  //     } else {
  //       if (word['lastestStatus'].toUpperCase().includes(queryString.toUpperCase())) {
  //         return true
  //       }
  //       return false
  //     }
  //   })
  //   return result
  // }

  private findStepEdit(month, step, m2, m4, m6) {
    let stepEdit: any
    // console.log(month, step)
    // console.log(m2)

    // if (request.qs() && request.qs().month && request.qs().step) {
    if (month === '2') {
      // console.log(m2)
      // if (step.includes(AllSteps.TR03_TR05_AND_SUPERVISION)) {
      //   const stepEditIndex = m2.findIndex((ele) => ele.name === AllSteps.TR03_TR05_AND_SUPERVISION)
      //   if (stepEditIndex > -1) {
      //     stepEdit = m2[stepEditIndex].find((ele) => ele.name === step)
      //   }
      // } else {
      stepEdit = m2.find((ele) => ele.name === step)
      // }
    } else if (month === '4') {
      // if (step.includes(AllSteps.TR03_TR05_AND_SUPERVISION)) {
      //   const stepEditIndex = m4.findIndex((ele) => ele.name === AllSteps.TR03_TR05_AND_SUPERVISION)
      //   if (stepEditIndex > -1) {
      //     stepEdit = m4[stepEditIndex].find((ele) => ele.name === step)
      //   }
      // } else {
      stepEdit = m4.find((ele) => ele.name === step)
      // }
    } else if (month === '6') {
      // if (step.includes(AllSteps.TR03_TR05_AND_SUPERVISION)) {
      //   const stepEditIndex = m6.findIndex((ele) => ele.name === AllSteps.TR03_TR05_AND_SUPERVISION)
      //   if (stepEditIndex > -1) {
      //     stepEdit = m6[stepEditIndex].find((ele) => ele.name === step)
      //   }
      // } else {
      stepEdit = m6.find((ele) => ele.name === step)
      // }
    }
    // }
    // console.log(stepEdit)

    return stepEdit
  }
  private async addTemplateFiletoStepMonth(stepMonth, month) {
    for (let i = 0; i < stepMonth.length; i++) {
      stepMonth[i]['templateFile'] = []

      const templateFileQuery = 'template' + stepMonth[i].name + month
      const templateFile = await File.query().where('step_file_type', templateFileQuery)

      if (templateFile && templateFile.length > 0) {
        for (let k = 0; k < templateFile.length; k++) {
          stepMonth[i]['templateFile'].push(templateFile[k].serialize())
        }
      }
    }
    return stepMonth
  }

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

            await Mail.use('smtp').send((message) => {
              message
                .from('iunnuidev2@gmail.com')
                .to('iunnuidev2@gmail.com')
                .subject('Granted account')
                .htmlView('emails/confirmStaff')
            })
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
      const users = await User.query().where('role', 'staff')
      for (let i = 0; i < users.length; i++) {
        const result = await UsersInAcademicYearModel.query()
          .where('user_id', users[i].user_id)
          .andWhere('academic_year', AcademicYearCf[0].academic_year)
        if (result && result.length > 0) {
          staffUsers.push(result[0])
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
      const users = await User.query().where('role', 'advisor')
      for (let i = 0; i < users.length; i++) {
        const result = await UsersInAcademicYearModel.query()
          .where('user_id', users[i].user_id)
          .andWhere('academic_year', AcademicYearCf[0].academic_year)
        if (result && result.length > 0) {
          advisorUsers.push(result[0])
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
      const users = await User.query().where('role', 'student')
      if (users && users.length > 0) {
        for (let i = 0; i < users.length; i++) {
          const result = await UsersInAcademicYearModel.query()
            .where('user_id', users[i].user_id)
            .andWhere('academic_year', AcademicYearCf[0].academic_year)
          if (result && result.length > 0) {
            studentUsers.push(users[i].serialize())
          }
        }
      }

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

      return response.status(200).json({ studentUsers: studentUsers })
    } catch (error) {
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
      const plans = [2, 4, 6]

      let stepsRender: any = this.showSteps(studentUser.student.plan)
      let nextStep: any = {}
      let currentSteps: any = {}
      const disabled =
        studentUser.student.plan === null || studentUser.student.plan === 0 ? '' : 'disabled'

      let userHasDocResult: any

      userHasDocResult = await UserHasDoc.query()
        .where('user_in_academic_year_id', usersInAcademicYear[0].id)
        .orderBy('created_at', 'desc')

      let submission: any = []
      let userHasDoc: any = []
      let isChangeStep: any = false
      let documentStatusesJsonCurrent: any

      if (userHasDocResult[0]) {
        if (
          request.qs().step &&
          (request.qs().step.includes('TR-03 and TR-05') ||
            request.qs().step.includes('Supervision'))
        ) {
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

          userHasDoc = await UserHasDoc.query()
            .where('step', TrStep)
            .andWhere('user_in_academic_year_id', usersInAcademicYear[0].id)
            .orderBy('created_at', 'desc')
          isChangeStep = true
        } else if (
          request.qs().step &&
          !request.qs().step.includes('TR-03 and TR-05') &&
          !request.qs().step.includes('Supervision')
        ) {
          userHasDoc = await UserHasDoc.query()
            .where('step', request.qs().step)
            .andWhere('user_in_academic_year_id', usersInAcademicYear[0].id)
            .orderBy('created_at', 'desc')
          isChangeStep = true
        } else {
          userHasDoc.push(userHasDocResult[0])
        }
      }

      if (userHasDoc && userHasDoc.length > 0) {
        documentStatusesJsonCurrent = userHasDoc[0].toJSON()
        const templateFileQuery =
          'template' + documentStatusesJsonCurrent.step + studentUser.student.plan
        const templateFile = await File.query().where('step_file_type', templateFileQuery)

        currentSteps['id'] = documentStatusesJsonCurrent.id
        if (templateFile && templateFile.length > 0) {
          currentSteps['templateFile'] = []
          for (let tmpIndex = 0; tmpIndex < templateFile.length; tmpIndex++) {
            currentSteps['templateFile'].push(templateFile[tmpIndex].serialize())
          }
        }
        currentSteps['file'] = {}
        currentSteps['file'].row = []
        currentSteps['supervision'] = {}

        const allUserHasDoc = await UserHasDoc.query().where(
          'user_in_academic_year_id',
          usersInAcademicYear[0].id
        )

        currentSteps['file'].row = []

        const objSupervision = {}

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
                .orderBy('created_at', 'desc')

              if (currentStepFile[0]) {
                currentSteps['file'] = currentStepFile[0].serialize()
              }

              currentSteps['sentFirmDate'] = allUserHasDoc[i].advisor_date
              currentSteps['recievedFirmDate'] = allUserHasDoc[i].complete_date
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
            (request.qs().step &&
              (request.qs().step.includes('Supervision') ||
                request.qs().step.includes('supervision'))) ||
            (documentStatusesJsonCurrent.step &&
              documentStatusesJsonCurrent.step.includes('Informed') &&
              documentStatusesJsonCurrent.status !== 'Approved')
          ) {
            if (
              allUserHasDoc[i] &&
              allUserHasDoc[i].step &&
              allUserHasDoc[i].step.includes('Informed')
            ) {
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
            }
          } else if (
            allUserHasDoc[i].step.includes('TR-03') &&
            documentStatusesJsonCurrent.step.includes('TR-03')
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

              if (currentStepFile[0]) {
                currentSteps['file'].row.push(currentStepFile[0].serialize())
              }
            }
          }
        }

        if (documentStatusesJsonCurrent.status === StepStatus.APPROVED) {
        }
        currentSteps['name'] = documentStatusesJsonCurrent.step
        currentSteps['status'] = documentStatusesJsonCurrent.status
        if (
          documentStatusesJsonCurrent.step.includes('TR-03 and TR-05') ||
          documentStatusesJsonCurrent.step.includes('supervision')
        ) {
          let showStep: any
          showStep = this.showSteps(studentUser.student.plan)
          const stepReIndex = showStep.findIndex(
            (ele) => ele.name === AllSteps.TR03_TR05_AND_SUPERVISION
          )
          if (stepReIndex > -1) {
            for (let shm = 0; shm < showStep[stepReIndex].month.length; shm++) {
              const stepRe = showStep[stepReIndex].month[shm].find(
                (ele) => ele.value === documentStatusesJsonCurrent.step
              )
              if (stepRe) {
                currentSteps['description'] = stepRe.description
              }
            }
          }
        } else {
          let showStep: any
          showStep = this.showSteps(studentUser.student.plan)
          const stepRe = showStep.find((ele) => ele.name === documentStatusesJsonCurrent.step)

          currentSteps['description'] = stepRe.description
        }

        currentSteps['createAt'] = moment(documentStatusesJsonCurrent.created_at.toString())
          .tz('Asia/Bangkok')
          .format('MMMM D, YYYY h:mm A')
        let stepIndex: any
        let monthStepIndex: any
        let stepsRenderIndex: any
        console.log(currentSteps['name'], 'name')

        if (
          (currentSteps['name'].includes(AllSteps.TR_03_TR_05) &&
            studentUser.student.plan &&
            studentUser.student.plan !== 2) ||
          (currentSteps['name'].includes(AllSteps.INFORMED_SUPERVISION) &&
            studentUser.student.plan &&
            studentUser.student.plan !== 2) ||
          (currentSteps['name'] === AllSteps.TR02 &&
            currentSteps['status'] === 'Approved' &&
            studentUser.student.plan &&
            studentUser.student.plan !== 2)
        ) {
          stepsRenderIndex = stepsRender.findIndex(
            (step) => step.name === AllSteps.TR03_TR05_AND_SUPERVISION
          )

          for (let i = 0; i < stepsRender[stepsRenderIndex].month.length; i++) {
            for (let j = 0; j < stepsRender[stepsRenderIndex].month[i].length; j++) {
              if (stepsRender[stepsRenderIndex].month[i][j].value === currentSteps['name']) {
                stepIndex = j
                monthStepIndex = i
                break
              }
            }
          }
        } else {
          stepIndex = stepsRender.findIndex((word) => word.name === currentSteps['name'])
        }
        if (userHasDoc[0].status === 'Approved') {
          if (
            (currentSteps['name'].includes(AllSteps.TR_03_TR_05) &&
              studentUser.student.plan &&
              studentUser.student.plan !== 2) ||
            (currentSteps['name'].includes(AllSteps.INFORMED_SUPERVISION) &&
              studentUser.student.plan &&
              studentUser.student.plan !== 2) ||
            (currentSteps['name'] === AllSteps.TR02 &&
              currentSteps['status'] === 'Approved' &&
              studentUser.student.plan &&
              studentUser.student.plan !== 2)
          ) {
            if (
              (!request.qs().step || request.qs().step !== AllSteps.TR02) &&
              currentSteps['name'] === AllSteps.TR02 &&
              currentSteps['status'] === 'Approved'
            ) {
              nextStep['name'] = stepsRender[stepsRenderIndex].month[0][0].value
              currentSteps['name'] = stepsRender[stepsRenderIndex].month[0][0].value // เปลี่ยน current สำหรับ 02 to 03-05
              const index = nextStep['name'].indexOf('(')
              const index2 = nextStep['name'].indexOf('5')
              const substr = nextStep['name'].substr(0, index2 + 1)
              nextStep['nameShow'] = substr + ' (Month ' + nextStep['name'][index + 1] + ')'

              currentSteps['status'] = ''
            } else {
              if (stepIndex >= 0) {
                nextStep =
                  stepIndex === 1
                    ? stepsRender[stepsRenderIndex].month[monthStepIndex + 1]
                      ? { name: stepsRender[stepsRenderIndex].month[monthStepIndex + 1][0].value }
                      : stepsRender[stepsRenderIndex + 1].name
                      ? stepsRender[stepsRenderIndex + 1]
                      : stepsRender[stepsRenderIndex].name
                    : { name: stepsRender[stepsRenderIndex].month[monthStepIndex][1].value }
                if (nextStep['name'] !== AllSteps.PRESENTATION) {
                  if (nextStep['name'].includes(AllSteps.INFORMED_SUPERVISION)) {
                    const index = nextStep['name'].indexOf('(')
                    const index2 = nextStep['name'].indexOf('on')
                    const indexStart = nextStep['name'].indexOf('s')
                    const substr =
                      nextStep['name'][indexStart].toUpperCase() +
                      nextStep['name'].substr(indexStart + 1, index2 - indexStart + 2)
                    nextStep['nameShow'] = substr + ' (Month ' + nextStep['name'][index + 1] + ')'
                  } else {
                    const index = nextStep['name'].indexOf('(')
                    const index2 = nextStep['name'].indexOf('5')
                    const substr = nextStep['name'].substr(0, index2 + 1)
                    nextStep['nameShow'] = substr + ' (Month ' + nextStep['name'][index + 1] + ')'
                  }
                }
              }
            }
          } else {
            if (stepIndex >= 0) {
              nextStep['name'] = stepsRender[stepIndex + 1]
                ? stepsRender[stepIndex + 1].name
                : stepsRender[stepIndex].name

              nextStep['nameShow'] = nextStep['name']
            }
          }
        } else {
          nextStep['name'] = currentSteps['name']
          if (
            (currentSteps['name'].includes(AllSteps.TR_03_TR_05) &&
              studentUser.student.plan &&
              studentUser.student.plan !== 2) ||
            (currentSteps['name'].includes(AllSteps.INFORMED_SUPERVISION) &&
              studentUser.student.plan &&
              studentUser.student.plan !== 2)
          ) {
            if (stepIndex >= 0) {
              nextStep['name'] =
                stepsRender[stepsRenderIndex].month[monthStepIndex][stepIndex].value
              if (nextStep.name !== AllSteps.PRESENTATION) {
                if (currentSteps['name'].includes(AllSteps.INFORMED_SUPERVISION)) {
                  const index = nextStep['name'].indexOf('(')
                  const index2 = nextStep['name'].indexOf('on')
                  const indexStart = nextStep['name'].indexOf('s')
                  const substr =
                    nextStep['name'][indexStart].toUpperCase() +
                    nextStep['name'].substr(indexStart + 1, index2 - indexStart + 2)
                  nextStep['nameShow'] = substr + ' (Month ' + nextStep['name'][index + 1] + ')'
                } else {
                  const index = nextStep['name'].indexOf('(')
                  const index2 = nextStep['name'].indexOf('5')
                  const substr = nextStep['name'].substr(0, index2 + 1)
                  nextStep['nameShow'] = substr + ' (Month ' + nextStep['name'][index + 1] + ')'
                }
              }
            }
          } else {
            if (stepIndex >= 0) {
              nextStep['name'] = stepsRender[stepIndex].name
              nextStep['nameShow'] = nextStep['name']
            }
          }
        }
      } else if (
        request.qs().step &&
        (request.qs().step.includes('TR-03 and TR-05') || request.qs().step.includes('Supervision'))
      ) {
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
        let showStep: any
        showStep = this.showSteps(studentUser.student.plan)
        const stepReIndex = showStep.findIndex(
          (ele) => ele.name === AllSteps.TR03_TR05_AND_SUPERVISION
        )

        if (stepReIndex > -1) {
          for (let shm = 0; shm < showStep[stepReIndex].month.length; shm++) {
            const stepRe = showStep[stepReIndex].month[shm].find((ele) => ele.value === TrStep)
            if (stepRe) {
              currentSteps['description'] = stepRe.description
            }
          }
        }
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
        currentSteps['name'] = request.qs().step
        let showStep: any
        showStep = this.showSteps(studentUser.student.plan)
        const stepRe = showStep.find((ele) => ele.name === request.qs().step)
        currentSteps['description'] = stepRe && stepRe.description ? stepRe.description : ''
        currentSteps['status'] = ''
        currentSteps['createAt'] = ''
        currentSteps['reason'] = ''
        currentSteps['file'] = {}
        currentSteps['supervision'] = {}
        nextStep['name'] = request.qs().step
      } else {
        currentSteps['name'] = stepsRender[0].name
        currentSteps['description'] = stepsRender[0].description
        currentSteps['status'] = ''
        currentSteps['createAt'] = ''
        currentSteps['reason'] = ''
        currentSteps['file'] = {}
        currentSteps['supervision'] = {}
        nextStep = stepsRender[0]
      }

      let step01Stat: any
      let step02Stat: any
      for (let i = 0; i < stepsRender.length; i++) {
        if (stepsRender[i]['name'].includes('Supervision')) {
          for (let j = 0; j < stepsRender[i].month.length; j++) {
            for (let k = 0; k < stepsRender[i].month[j].length; k++) {
              const allLastestStepStat = await UserHasDoc.query()
                .where('step', stepsRender[i].month[j][k].value)
                .andWhere('user_in_academic_year_id', usersInAcademicYear[0].id)
                .orderBy('created_at', 'desc')
              if (allLastestStepStat && allLastestStepStat.length > 0) {
                stepsRender[i].month[j][k]['status'] = allLastestStepStat[0].status
              }
            }
          }
        } else {
          const allLastestStepStat = await UserHasDoc.query()
            .where('step', stepsRender[i].name)
            .andWhere('user_in_academic_year_id', usersInAcademicYear[0].id)
            .orderBy('created_at', 'desc')
          if (allLastestStepStat && allLastestStepStat.length > 0) {
            const stepIndexTmp = stepsRender.findIndex(
              (word) => word.name === allLastestStepStat[0].step
            )
            stepsRender[stepIndexTmp]['status'] = allLastestStepStat[0].status
            if (stepsRender[i].name === AllSteps.TR01) {
              step01Stat = allLastestStepStat[0].status
            }
            if (stepsRender[i].name === AllSteps.TR02) {
              step02Stat = allLastestStepStat[0].status
            }
          }
        }
      }
      const isEmpty =
        currentSteps.file.row &&
        currentSteps.file.row.length > 0 &&
        Object.values(currentSteps.file.row[0]).every((x: object) => Object.keys(x).length === 0)
      if (isEmpty) {
        currentSteps.file = {}
      }
      console.log(currentSteps)
      // console.log(stepsRender[2].month)
      // console.log(stepsRender)
      // console.log(currentSteps.supervision)
      console.log(currentSteps.file.row)

      // console.log(currentSteps.file.signedFile)
      // console.log(currentSteps.file.studentFile[0])
      console.log(nextStep)
      const academicYearAll = await AcademicYear.query().orderBy('updated_at', 'desc')
      return view.render('student-information', {
        studentUser,
        plans,
        isChangeStep,
        disabled,
        nextStep,
        currentSteps,
        stepsRender,
        submission: submission,
        studentInfo: studentInfo,
        academicYears: academicYearAll,
        step01Stat,
        step02Stat,
      })
    } catch (error) {
      console.log(error)

      return response.status(400).json({ message: error.message })
    }
  }

  public async updateStudentUserStatus({ auth, session, request, response }: HttpContextContract) {
    try {
      const {
        study,
        status,
        step,
        reason,
        date,
        completeDate,
        supervisionStatus,
        meetingLink,
        advisorComment,
        dateConfirmStatus,
        isSigned,
        advisorDate,
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
        'advisorDate',
      ])
      console.log('เข้า')

      const years = await AcademicYear.query().orderBy('updated_at', 'desc')
      let usersInAcademicYear: any
      const studentUsersRole = await User.query()
        .where('role', 'student')
        .andWhere('user_id', request.param('id'))
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

      if (study) {
        usersInAcademicYear[0].student.plan = study
        await usersInAcademicYear[0].student.save()
        const userHasDoc = await UserHasDoc.query().where(
          'user_in_academic_year_id',
          usersInAcademicYear[0].id
        )

        if (userHasDoc && userHasDoc.length > 0) {
          for (let i = 0; i < userHasDoc.length; i++) {
            await File.query().where('user_has_doc_id', userHasDoc[i].id).delete()
            userHasDoc[i].delete()
          }
        }
        return response.redirect('/student-information/' + usersInAcademicYear[0].user_id)
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

      if (date) {
        if (user[0].role === 'advisor') {
          body['advisor_date'] = date
        } else {
          body['student_date'] = date
          body['is_react'] = true
          body['is_signed'] = isSigned
        }
      }

      if (advisorDate) {
        body['advisor_date'] = advisorDate
      } else if (step && step === AllSteps.TR02 && !advisorDate && request.qs().step) {
        throw new Error('no adDate')
      }

      if (completeDate) {
        body['complete_date'] = completeDate
      } else if (step && step === AllSteps.TR02 && !completeDate && request.qs().step) {
        throw new Error('no compDate')
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

      if (
        status &&
        status !== StepStatus.PENDING &&
        step &&
        step !== AllSteps.TR02 &&
        step !== AllSteps.PRESENTATION
      ) {
        const stepTracking = await usersInAcademicYear[0]
          .related('userHasDoc')
          .query()
          .where('step', step)
          .orderBy('created_at', 'desc')
        for (let i = 0; i < Object.keys(body).length; i++) {
          stepTracking[0][Object.keys(body)[i]] = body[Object.keys(body)[i]]
        }
        await stepTracking[0].save()
      } else if ((step && step === AllSteps.TR02) || (step && step === AllSteps.PRESENTATION)) {
        const stepTracking = await usersInAcademicYear[0]
          .related('userHasDoc')
          .query()
          .where('step', step)
          .orderBy('created_at', 'desc')
        if (stepTracking && stepTracking.length > 0) {
          for (let i = 0; i < Object.keys(body).length; i++) {
            stepTracking[0][Object.keys(body)[i]] = body[Object.keys(body)[i]]
          }
          await stepTracking[0].save()
        } else {
          await usersInAcademicYear[0].related('userHasDoc').create(body)
        }
      } else {
        await usersInAcademicYear[0].related('userHasDoc').create(body)
      }
      return response.status(200).json('success')
    } catch (error) {
      console.log(error)
      if (
        error.message === 'no adDate' ||
        error.message === 'no compDate'
        // error.message === 'empty role'
      ) {
        session.flash({
          error: 'All fields are required',
          type: 'negative',
        })
      }
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

  private showSteps(month) {
    const steps =
      month === 6
        ? [
            {
              name: Steps6Month.TR01,
              description:
                'เอกสารขอความอนุเคราะห์เข้าฝึกงาน เมื่อนักศึกษากรอกข้อมูลในเอกสารครบถ้วนและส่งเข้าระบบแล้ว โปรดตรวจสอบว่ามีการให้แก้ไขจากอาจารย์หรือไม่ เมื่อเอกสารของนักศึกษาถูกต้องสมบูรณ์ จะมีการเซ็นเอกสารจากอาจารย์ส่งเข้าระบบ',
              // defaultFile:
            },
            {
              name: Steps6Month.TR02,
              description:
                'เอกสารตอบรับเข้าฝึกงานจากบริษัท เมื่อได้รับแล้ว เจ้าหน้าที่จะมีการส่งเอกสารเข้ามายังระบบ',
            },
            {
              name: Steps6Month.TR03_TR05_AND_SUPERVISION,
              month: [
                [
                  {
                    name: Steps6Month.TR_03_TR_05,
                    value: Steps6Month.TR03_AND_TR05_1_6,
                    description:
                      'เอกสารรายงานความก้าวหน้าประจำสัปดาห์ของแต่ละเดือน (TR-03) และ เอกสารรายงานความก้าวหน้าประจำเดือน (TR-05) เมื่อนักศึกษาส่งเข้าระบบแล้ว โปรดตรวจสอบว่ามีการให้แก้ไขจากเจ้าหน้าที่หรือไม่',
                  },
                  {
                    name: Steps6Month.SUPERVISION,
                    value: Steps6Month.INFORMED_SUPERVISION_1_6,
                    description:
                      'บันทึกข้อมูลการนิเทศนักศึกษา โปรดรอวันนัดหมายจากอาจารย์ก่อนยืนยันหรือขอเปลี่ยนแปลงวันนัดหมาย เมื่อจบการนิเทศแล้วให้นักศึกษาเปลี่ยนสถานะของการนิเทศจาก Pending เป็น Done',
                  },
                ],
                [
                  {
                    name: Steps6Month.TR_03_TR_05,
                    value: Steps6Month.TR03_AND_TR05_2_6,
                    description:
                      'เอกสารรายงานความก้าวหน้าประจำสัปดาห์ของแต่ละเดือน (TR-03) และ เอกสารรายงานความก้าวหน้าประจำเดือน (TR-05) เมื่อนักศึกษาส่งเข้าระบบแล้ว โปรดตรวจสอบว่ามีการให้แก้ไขจากเจ้าหน้าที่หรือไม่',
                  },
                  {
                    name: Steps6Month.SUPERVISION,
                    value: Steps6Month.INFORMED_SUPERVISION_2_6,
                    description:
                      'บันทึกข้อมูลการนิเทศนักศึกษา โปรดรอวันนัดหมายจากอาจารย์ก่อนยืนยันหรือขอเปลี่ยนแปลงวันนัดหมาย เมื่อจบการนิเทศแล้วให้นักศึกษาเปลี่ยนสถานะของการนิเทศจาก Pending เป็น Done',
                  },
                ],
                [
                  {
                    name: Steps6Month.TR_03_TR_05,
                    value: Steps6Month.TR03_AND_TR05_3_6,
                    description:
                      'เอกสารรายงานความก้าวหน้าประจำสัปดาห์ของแต่ละเดือน (TR-03) และ เอกสารรายงานความก้าวหน้าประจำเดือน (TR-05) เมื่อนักศึกษาส่งเข้าระบบแล้ว โปรดตรวจสอบว่ามีการให้แก้ไขจากเจ้าหน้าที่หรือไม่',
                  },
                  {
                    name: Steps6Month.SUPERVISION,
                    value: Steps6Month.INFORMED_SUPERVISION_3_6,
                    description:
                      'บันทึกข้อมูลการนิเทศนักศึกษา โปรดรอวันนัดหมายจากอาจารย์ก่อนยืนยันหรือขอเปลี่ยนแปลงวันนัดหมาย เมื่อจบการนิเทศแล้วให้นักศึกษาเปลี่ยนสถานะของการนิเทศจาก Pending เป็น Done',
                  },
                ],
                [
                  {
                    name: Steps6Month.TR_03_TR_05,
                    value: Steps6Month.TR03_AND_TR05_4_6,
                    description:
                      'เอกสารรายงานความก้าวหน้าประจำสัปดาห์ของแต่ละเดือน (TR-03) และ เอกสารรายงานความก้าวหน้าประจำเดือน (TR-05) เมื่อนักศึกษาส่งเข้าระบบแล้ว โปรดตรวจสอบว่ามีการให้แก้ไขจากเจ้าหน้าที่หรือไม่',
                  },
                  {
                    name: Steps6Month.SUPERVISION,
                    value: Steps6Month.INFORMED_SUPERVISION_4_6,
                    description:
                      'บันทึกข้อมูลการนิเทศนักศึกษา โปรดรอวันนัดหมายจากอาจารย์ก่อนยืนยันหรือขอเปลี่ยนแปลงวันนัดหมาย เมื่อจบการนิเทศแล้วให้นักศึกษาเปลี่ยนสถานะของการนิเทศจาก Pending เป็น Done',
                  },
                ],
                [
                  {
                    name: Steps6Month.TR_03_TR_05,
                    value: Steps6Month.TR03_AND_TR05_5_6,
                    description:
                      'เอกสารรายงานความก้าวหน้าประจำสัปดาห์ของแต่ละเดือน (TR-03) และ เอกสารรายงานความก้าวหน้าประจำเดือน (TR-05) เมื่อนักศึกษาส่งเข้าระบบแล้ว โปรดตรวจสอบว่ามีการให้แก้ไขจากเจ้าหน้าที่หรือไม่',
                  },
                  {
                    name: Steps6Month.SUPERVISION,
                    value: Steps6Month.INFORMED_SUPERVISION_5_6,
                    description:
                      'บันทึกข้อมูลการนิเทศนักศึกษา โปรดรอวันนัดหมายจากอาจารย์ก่อนยืนยันหรือขอเปลี่ยนแปลงวันนัดหมาย เมื่อจบการนิเทศแล้วให้นักศึกษาเปลี่ยนสถานะของการนิเทศจาก Pending เป็น Done',
                  },
                ],
                [
                  {
                    name: Steps6Month.TR_03_TR_05,
                    value: Steps6Month.TR03_AND_TR05_6_6,
                    description:
                      'เอกสารรายงานความก้าวหน้าประจำสัปดาห์ของแต่ละเดือน (TR-03) และ เอกสารรายงานความก้าวหน้าประจำเดือน (TR-05) เมื่อนักศึกษาส่งเข้าระบบแล้ว โปรดตรวจสอบว่ามีการให้แก้ไขจากเจ้าหน้าที่หรือไม่',
                  },
                  {
                    name: Steps6Month.SUPERVISION,
                    value: Steps6Month.INFORMED_SUPERVISION_6_6,
                    description:
                      'บันทึกข้อมูลการนิเทศนักศึกษา โปรดรอวันนัดหมายจากอาจารย์ก่อนยืนยันหรือขอเปลี่ยนแปลงวันนัดหมาย เมื่อจบการนิเทศแล้วให้นักศึกษาเปลี่ยนสถานะของการนิเทศจาก Pending เป็น Done',
                  },
                ],
              ],
            },
            {
              name: Steps6Month.PRESENTATION,
              description: 'งานนำเสนอการฝึกงานของนักษาที่ใช้ประกอบการนิเทศครั้งสุดท้าย',
            },
            {
              name: Steps6Month.TR03_TR06,
              description:
                'เอกสารรายงานความก้าวหน้าประจำสัปดาห์ของแต่ละเดือน (TR-03) และ เอกสารรายงานการฝึกงานฉบับสมบูรณ์ (TR-06) เมื่อนักศึกษาส่งเข้าระบบแล้ว โปรดตรวจสอบว่ามีการให้แก้ไขจากเจ้าหน้าที่หรือไม่',
            },
          ]
        : month === 4
        ? [
            {
              name: Steps4Month.TR01,
              description:
                'เอกสารขอความอนุเคราะห์เข้าฝึกงาน เมื่อนักศึกษากรอกข้อมูลในเอกสารครบถ้วนและส่งเข้าระบบแล้ว โปรดตรวจสอบว่ามีการให้แก้ไขจากอาจารย์หรือไม่ เมื่อเอกสารของนักศึกษาถูกต้องสมบูรณ์ จะมีการเซ็นเอกสารจากอาจารย์ส่งเข้าระบบ',
            },
            {
              name: Steps4Month.TR02,
              description:
                'เอกสารตอบรับเข้าฝึกงานจากบริษัท เมื่อได้รับแล้ว เจ้าหน้าที่จะมีการส่งเอกสารเข้ามายังระบบ',
            },
            {
              name: Steps4Month.TR03_TR05_AND_SUPERVISION,
              month: [
                [
                  {
                    name: Steps4Month.TR_03_TR_05,
                    value: Steps4Month.TR03_AND_TR05_1_4,
                    description:
                      'เอกสารรายงานความก้าวหน้าประจำสัปดาห์ของแต่ละเดือน (TR-03) และ เอกสารรายงานความก้าวหน้าประจำเดือน (TR-05) เมื่อนักศึกษาส่งเข้าระบบแล้ว โปรดตรวจสอบว่ามีการให้แก้ไขจากเจ้าหน้าที่หรือไม่',
                  },
                  {
                    name: Steps4Month.SUPERVISION,
                    value: Steps4Month.INFORMED_SUPERVISION_1_4,
                    description:
                      'บันทึกข้อมูลการนิเทศนักศึกษา โปรดรอวันนัดหมายจากอาจารย์ก่อนยืนยันหรือขอเปลี่ยนแปลงวันนัดหมาย เมื่อจบการนิเทศแล้วให้นักศึกษาเปลี่ยนสถานะของการนิเทศจาก Pending เป็น Done',
                  },
                ],
                [
                  {
                    name: Steps4Month.TR_03_TR_05,
                    value: Steps4Month.TR03_AND_TR05_2_4,
                    description:
                      'เอกสารรายงานความก้าวหน้าประจำสัปดาห์ของแต่ละเดือน (TR-03) และ เอกสารรายงานความก้าวหน้าประจำเดือน (TR-05) เมื่อนักศึกษาส่งเข้าระบบแล้ว โปรดตรวจสอบว่ามีการให้แก้ไขจากเจ้าหน้าที่หรือไม่',
                  },
                  {
                    name: Steps4Month.SUPERVISION,
                    value: Steps4Month.INFORMED_SUPERVISION_2_4,
                    description:
                      'บันทึกข้อมูลการนิเทศนักศึกษา โปรดรอวันนัดหมายจากอาจารย์ก่อนยืนยันหรือขอเปลี่ยนแปลงวันนัดหมาย เมื่อจบการนิเทศแล้วให้นักศึกษาเปลี่ยนสถานะของการนิเทศจาก Pending เป็น Done',
                  },
                ],
                [
                  {
                    name: Steps4Month.TR_03_TR_05,
                    value: Steps4Month.TR03_AND_TR05_3_4,
                    description:
                      'เอกสารรายงานความก้าวหน้าประจำสัปดาห์ของแต่ละเดือน (TR-03) และ เอกสารรายงานความก้าวหน้าประจำเดือน (TR-05) เมื่อนักศึกษาส่งเข้าระบบแล้ว โปรดตรวจสอบว่ามีการให้แก้ไขจากเจ้าหน้าที่หรือไม่',
                  },
                  {
                    name: Steps4Month.SUPERVISION,
                    value: Steps4Month.INFORMED_SUPERVISION_3_4,
                    description:
                      'บันทึกข้อมูลการนิเทศนักศึกษา โปรดรอวันนัดหมายจากอาจารย์ก่อนยืนยันหรือขอเปลี่ยนแปลงวันนัดหมาย เมื่อจบการนิเทศแล้วให้นักศึกษาเปลี่ยนสถานะของการนิเทศจาก Pending เป็น Done',
                  },
                ],
                [
                  {
                    name: Steps4Month.TR_03_TR_05,
                    value: Steps4Month.TR03_AND_TR05_4_4,
                    description:
                      'เอกสารรายงานความก้าวหน้าประจำสัปดาห์ของแต่ละเดือน (TR-03) และ เอกสารรายงานความก้าวหน้าประจำเดือน (TR-05) เมื่อนักศึกษาส่งเข้าระบบแล้ว โปรดตรวจสอบว่ามีการให้แก้ไขจากเจ้าหน้าที่หรือไม่',
                  },
                  {
                    name: Steps4Month.SUPERVISION,
                    value: Steps4Month.INFORMED_SUPERVISION_4_4,
                    description:
                      'บันทึกข้อมูลการนิเทศนักศึกษา โปรดรอวันนัดหมายจากอาจารย์ก่อนยืนยันหรือขอเปลี่ยนแปลงวันนัดหมาย เมื่อจบการนิเทศแล้วให้นักศึกษาเปลี่ยนสถานะของการนิเทศจาก Pending เป็น Done',
                  },
                ],
              ],
            },
            {
              name: Steps4Month.PRESENTATION,
              description: 'งานนำเสนอการฝึกงานของนักษาที่ใช้ประกอบการนิเทศครั้งสุดท้าย',
            },
            {
              name: Steps4Month.TR03_TR06,
              description:
                'เอกสารรายงานความก้าวหน้าประจำสัปดาห์ของแต่ละเดือน (TR-03) และ เอกสารรายงานการฝึกงานฉบับสมบูรณ์ (TR-06) เมื่อนักศึกษาส่งเข้าระบบแล้ว โปรดตรวจสอบว่ามีการให้แก้ไขจากเจ้าหน้าที่หรือไม่',
            },
          ]
        : [
            {
              name: Steps2Month.TR01,
              description:
                'เอกสารขอความอนุเคราะห์เข้าฝึกงาน เมื่อนักศึกษากรอกข้อมูลในเอกสารครบถ้วนและส่งเข้าระบบแล้ว โปรดตรวจสอบว่ามีการให้แก้ไขจากอาจารย์หรือไม่ เมื่อเอกสารของนักศึกษาถูกต้องสมบูรณ์ จะมีการเซ็นเอกสารจากอาจารย์ส่งเข้าระบบ',
            },
            {
              name: Steps2Month.TR02,
              description:
                'เอกสารตอบรับเข้าฝึกงานจากบริษัท เมื่อได้รับแล้ว เจ้าหน้าที่จะมีการส่งเอกสารเข้ามายังระบบ',
            },
            {
              name: Steps2Month.INFORMED_SUPERVISION,
              description:
                'บันทึกข้อมูลการนิเทศนักศึกษา โปรดรอวันนัดหมายจากอาจารย์ก่อนยืนยันหรือขอเปลี่ยนแปลงวันนัดหมาย เมื่อจบการนิเทศแล้วให้นักศึกษาเปลี่ยนสถานะของการนิเทศจาก Pending เป็น Done',
            },
            {
              name: Steps2Month.PRESENTATION,
              description: 'งานนำเสนอการฝึกงานของนักษาที่ใช้ประกอบการนิเทศครั้งสุดท้าย',
            },
            {
              name: Steps2Month.TR03_AND_TR08,
              description:
                'เอกสารรายงานความก้าวหน้าประจำสัปดาห์ของแต่ละเดือน (TR-03) และ เอกสารรายงานการฝึกงานฉบับสมบูรณ์ (TR-08) เมื่อนักศึกษาส่งเข้าระบบแล้ว โปรดตรวจสอบว่ามีการให้แก้ไขจากเจ้าหน้าที่หรือไม่',
            },
          ]

    return steps
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
          step_file_type: 'templateTR-016',
        })

        await File.create({
          file_id: 'TR-02DEF',
          file_name: 'TR-02DEF.pdf',
          file_size: '200.06 KB',
          step_file_type: 'templateTR-026',
        })
      }

      return year
    } catch (error) {
      console.log(error)
    }
  }
}
