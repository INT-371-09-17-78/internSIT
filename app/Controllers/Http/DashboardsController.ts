import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'
import Student from 'App/Models/Student'
import UsersInAcademicYearModel from 'App/Models/UsersInAcademicYear'
import AcademicYear from 'App/Models/AcademicYear'
import stepService from 'App/Services/stepServices'
import UserHasDoc from 'App/Models/UserHasDoc'
import { AllSteps, StepStatus } from 'Contracts/enum'

export default class DashboardsController {
  public async showDashboard({ request, auth, response, view }: HttpContextContract) {
    try {
      let AcademicYearCf: any
      let studentUsers: any = []
      let resultAdvisorRe: any = 0
      let resultStaffRe: any = 0
      const StepsServices = new stepService()
      const AcademicYearAll = await AcademicYear.query().orderBy('updated_at', 'desc')
      if (auth.user?.role === 'student') {
        AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
      } else {
        if (request.cookie('year')) {
          AcademicYearCf = await AcademicYear.query().where('academic_year', request.cookie('year'))
        } else {
          AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
        }
      }
      console.log(AcademicYearCf[0].academic_year)

      if (AcademicYearCf && AcademicYearCf.length > 0) {
        const UsersInAcademicYear = await UsersInAcademicYearModel.query()
          .where('academic_year', AcademicYearCf[0].academic_year)
          .andWhere('approved', true)
        // console.log(UsersInAcademicYear)

        for (let i = 0; i < UsersInAcademicYear.length; i++) {
          const result = await User.query()
            .where('role', 'student')
            .andWhere('user_id', UsersInAcademicYear[i].user_id)

          const resultAdvisor = await User.query()
            .where('role', 'advisor')
            .andWhere('user_id', UsersInAcademicYear[i].user_id)
          resultAdvisorRe = resultAdvisorRe + resultAdvisor.length
          const resultStaff = await User.query()
            .where('role', 'staff')
            .andWhere('user_id', UsersInAcademicYear[i].user_id)
          resultStaffRe = resultStaffRe + resultStaff.length
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
      }

      let studentUsers2: any
      let studentUsers4: any
      let studentUsers6: any
      let allSt: any
      let notSub: any = 0
      allSt = studentUsers.length
      studentUsers2 = studentUsers.filter((userPre) => userPre.plan === 2).length

      studentUsers4 = studentUsers.filter((userPre) => userPre.plan === 4).length

      studentUsers6 = studentUsers.filter((userPre) => userPre.plan === 6).length

      if (request.qs().month) {
        studentUsers = studentUsers.filter(
          (userPre) => userPre.plan === parseInt(request.qs().month)
        )
      }
      const AllStepByMonth = {}
      AllStepByMonth['twoMonth'] = StepsServices.showSteps(2)
      AllStepByMonth['fourMonth'] = StepsServices.showSteps(4)
      AllStepByMonth['sixMonth'] = StepsServices.showSteps(6)
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

      if (studentUsers && studentUsers.length > 0) {
        for (let i = 0; i < studentUsers.length; i++) {
          const usersInAcademicYear = await UsersInAcademicYearModel.query()
            .where('user_id', studentUsers[i].user_id)
            .andWhere('academic_year', AcademicYearCf[0].academic_year)

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

                    Object.values(StepStatus).forEach((x) => {
                      // if (stepRender[j].month[k][g][x + ' Total'])
                      // console.log(stepRender[j].month[k][g].value)
                      // console.log(x)
                      stepRender[j].month[k][g][x + ' Total'] = studentUsers.filter(
                        (y) => y[stepRender[j].month[k][g].value] === x
                      ).length
                      // notSub = notSub + stepRender[j].month[k][g][x + ' Total']
                    })

                    // Object.values(StepStatus).forEach((x) => {
                    //   stepRender[j][x + ' Total'] = studentUsers.filter(
                    //     (y) => y[stepRender[j].name] === x
                    //   ).length
                    //   //   console.log(notSub)
                    // })
                    // stepRender[j].month[k][g]['Not Summited' + ' Total'] =
                    //   studentUsers.length - notSub
                    stepRender[j].month[k][g]['Max'] = studentUsers.length
                    console.log(stepRender[j].month[k][g]['Pending' + ' Total'])
                  }
                }
              } else {
                const result = await UserHasDoc.query()
                  .where('user_in_academic_year_id', usersInAcademicYear[0].id)
                  .andWhere('step', stepRender[j].name)
                  .orderBy('created_at', 'desc')
                studentUsers[i][stepRender[j].name] =
                  result && result.length > 0 ? result[0].serialize().status : null

                Object.values(StepStatus).forEach((x) => {
                  stepRender[j][x + ' Total'] = studentUsers.filter(
                    (y) => y[stepRender[j].name] === x
                  ).length
                  notSub = notSub + stepRender[j][x + ' Total']
                  //   console.log(notSub)
                })

                stepRender[j]['Not Summited' + ' Total'] = studentUsers.length - notSub
                stepRender[j]['Max'] = studentUsers.length
              }
            }
          }
        }
        // console.log(allSt - notSub)
      }
      // console.log(stepRender[2].month)

      return view.render('dashboard', {
        stepRender: stepRender,
        resultAdvisorRe,
        resultStaffRe,
        allSt,
        studentUsers2,
        studentUsers4,
        studentUsers6,
        academicYears: AcademicYearAll,
        // notSub: allSt - notSub,
      })
    } catch (error) {
      console.log(error)

      return response.status(400).json({ message: error.message })
    }
  }
}
