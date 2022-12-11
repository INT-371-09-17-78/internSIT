import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'
import Student from 'App/Models/Student'
import File from 'App/Models/File'
import { StepStatus, AllSteps } from 'Contracts/enum'
import AcademicYear from 'App/Models/AcademicYear'
import UserHasDoc from 'App/Models/UserHasDoc'
import UsersInAcademicYearModel from 'App/Models/UsersInAcademicYear'
// import LdapAuth from 'ldapauth-fork'
import moment from 'moment-timezone'
// import Mail from '@ioc:Adonis/Addons/Mail'
import stepService from 'App/Services/stepServices'

export default class StepsController {
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
      const StepsServices = new stepService()

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
        // console.log(studentUsers)
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
      AllStepByMonth['twoMonth'] = StepsServices.showSteps(2)
      AllStepByMonth['fourMonth'] = StepsServices.showSteps(4)
      AllStepByMonth['sixMonth'] = StepsServices.showSteps(6)
      let stepEdit: any
      AllStepByMonth['twoMonth'] = await StepsServices.addTemplateFiletoStepMonth(
        AllStepByMonth['twoMonth'],
        2
      )
      AllStepByMonth['fourMonth'] = await StepsServices.addTemplateFiletoStepMonth(
        AllStepByMonth['fourMonth'],
        4
      )
      AllStepByMonth['sixMonth'] = await StepsServices.addTemplateFiletoStepMonth(
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

      console.log(stepRender)

      if (request.qs() && request.qs().month && request.qs().step) {
        stepEdit = StepsServices.findStepEdit(
          request.qs().month,
          request.qs().step,
          AllStepByMonth['twoMonth'],
          AllStepByMonth['fourMonth'],
          AllStepByMonth['sixMonth']
        )
      }
      //   console.log(stepEdit)

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
            if (studentUsers[i].plan) {
              studentUsers[i]['lastestStatus'] = AllSteps.TR01 + ` ` + StepStatus.WAITING
            } else {
              studentUsers[i]['lastestStatus'] = `No plan selected`
            }
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
      const stepServices = new stepService()
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
          stSerialize['studentAc'] = usersInAcademicYear[0]
          studentUser = stSerialize
        }
      }
      //   console.log(studentUser.student)

      //   const userSt = await UsersInAcademicYearModel.query()
      //     //   .where('user_id', studentUsersRole[0].user_id)
      //     .andWhere('academic_year', AcademicYearCf[0].academic_year)
      //     .preload('student')
      //   console.log(userSt[0])

      //   const noApprove = userSt[0].student.filter((st) => !st.approved)

      if (!request.qs().step) {
        response.redirect('/student-information/' + usersInAcademicYear[0].user_id + '?step=TR-01')
      }

      let avisorSt: any
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
      //   console.log(avisorSt[0].firstname)
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
          value:
            avisorSt && avisorSt.length > 0
              ? avisorSt[0].firstname + ' ' + avisorSt[0].lastname
              : '',
          // ? studentUser.student['advisorFullName']
          // : '',
          key: 'advisorFullName',
        },
      ]
      const plans = [2, 4, 6]

      let stepsRender: any = stepServices.showSteps(studentUser.student.plan)
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
      //   console.log(request.qs().step)

      if (request.qs() && request.qs().step) {
        const templateFileQuery =
          'template' +
          studentUser.student.plan +
          (request.qs().step.includes('TR-03 and TR-05') ||
          request.qs().step.includes('Supervision')
            ? AllSteps.TR03_TR05_AND_SUPERVISION
            : request.qs().step) +
          AcademicYearCf[0].academic_year
        //   console.log(documentStatusesJsonCurrent.step)
        // console.log(templateFileQuery)

        const templateFile = await File.query().where('step_file_type', templateFileQuery)
        // console.log(templateFile)

        if (templateFile && templateFile.length > 0) {
          currentSteps['templateFile'] = []
          for (let tmpIndex = 0; tmpIndex < templateFile.length; tmpIndex++) {
            currentSteps['templateFile'].push(templateFile[tmpIndex].serialize())
          }
        }
      }

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
        currentSteps['id'] = documentStatusesJsonCurrent.id
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
          showStep = stepServices.showSteps(studentUser.student.plan)
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
          showStep = stepServices.showSteps(studentUser.student.plan)
          const stepRe = showStep.find((ele) => ele.name === documentStatusesJsonCurrent.step)

          currentSteps['description'] = stepRe.description
        }

        currentSteps['createAt'] = moment(documentStatusesJsonCurrent.created_at.toString())
          .tz('Asia/Bangkok')
          .format('MMMM D, YYYY h:mm A')
        let stepIndex: any
        let monthStepIndex: any
        let stepsRenderIndex: any
        // console.log(currentSteps['name'], 'name')

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
        showStep = stepServices.showSteps(studentUser.student.plan)
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
        showStep = stepServices.showSteps(studentUser.student.plan)
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
      //   console.log(currentSteps.file.row)

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
        // noApprove,
      })
    } catch (error) {
      console.log(error)

      return response.status(400).json({ message: error.message })
    }
  }

  public async updateStudentUserStatus({ auth, session, request, response }: HttpContextContract) {
    try {
      const {
        // study,
        // status,
        // step,
        // reason,
        // date,
        // completeDate,
        // supervisionStatus,
        // meetingLink,
        // // advisorComment,
        // dateConfirmStatus,
        // isSigned,
        // advisorDate,
        info,
        // files,
      } = request.only([
        // 'study',
        // 'status',
        // 'step',
        // 'reason',
        // 'date',
        // 'stepStatId',
        // 'supervisionStatus',
        // 'meetingLink',
        // 'advisorComment',
        // 'dateConfirmStatus',
        // 'isSigned',
        // 'completeDate',
        // 'advisorDate',
        'info',
        // 'files',
      ])
      // console.log(info.isSigned, 'asdasdasd')
      const infoParse = JSON.parse(info)
      // let err: Object[] = []
      let err: Object[] = []
      console.log(infoParse)
      // console.log(infoParse.date)
      const files = request.files('files', {
        size: '3mb',
      })
      if (
        infoParse.step === AllSteps.TR02 &&
        (!files || files.length === 0 || !infoParse.advisorDate || !infoParse.completeDate)
      ) {
        err.push({ field: 'all field are required' })
      }
      if (err && err.length > 0) {
        throw err
      }
      console.log(files.length)

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

      if (infoParse.study) {
        usersInAcademicYear[0].student.plan = infoParse.study
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
      if (infoParse.status && infoParse.step) {
        body['status'] = infoParse.status
        body['step'] = infoParse.step
        body['is_react'] =
          auth.user?.role === 'advisor' || auth.user?.role === 'staff' ? true : false
        body['is_signed'] =
          auth.user?.role === 'advisor' || auth.user?.role === 'staff' ? infoParse.isSigned : false
        body['no_approve_reason'] =
          infoParse.reason && infoParse.reason !== null && infoParse.status === 'Disapproved'
            ? infoParse.reason
            : null
        if (infoParse.step.includes('Informed')) {
          body['is_new'] = auth.user?.role === 'student' ? false : true
        }
      }
      console.log(info)
      if (infoParse.date) {
        if (user[0].role === 'advisor') {
          body['advisor_date'] = infoParse.date
        } else {
          console.log('เข้าหรอ')

          body['student_date'] = infoParse.date
          body['is_react'] = true
          body['is_signed'] = infoParse.isSigned
        }
      }

      if (infoParse.advisorDate) {
        body['advisor_date'] = infoParse.advisorDate
      }
      // else if (
      //   infoParse.step &&
      //   infoParse.step === AllSteps.TR02 &&
      //   !infoParse.advisorDate &&
      //   request.qs().step
      // ) {
      //   throw new Error('no adDate')
      // }

      if (infoParse.completeDate) {
        body['complete_date'] = infoParse.completeDate
      }
      // else if (
      //   infoParse.step &&
      //   infoParse.step === AllSteps.TR02 &&
      //   !infoParse.completeDate &&
      //   request.qs().step
      // ) {
      //   throw new Error('no compDate')
      // }

      if (infoParse.supervisionStatus) {
        body['supervision_status'] = infoParse.supervisionStatus
      }

      if (infoParse.meetingLink) {
        body['meeting_link'] = infoParse.meetingLink
      }

      // if (advisorComment) {
      //   body['advisor_comment'] = advisorComment
      // }

      if (infoParse.dateConfirmStatus) {
        body['date_confirm_status'] = infoParse.dateConfirmStatus
      }

      if (
        infoParse.status &&
        infoParse.status !== StepStatus.PENDING &&
        infoParse.step &&
        infoParse.step !== AllSteps.TR02 &&
        infoParse.step !== AllSteps.PRESENTATION
      ) {
        const stepTracking = await usersInAcademicYear[0]
          .related('userHasDoc')
          .query()
          .where('step', infoParse.step)
          .orderBy('created_at', 'desc')
        for (let i = 0; i < Object.keys(body).length; i++) {
          stepTracking[0][Object.keys(body)[i]] = body[Object.keys(body)[i]]
        }
        await stepTracking[0].save()
      } else if (
        (infoParse.step && infoParse.step === AllSteps.TR02) ||
        (infoParse.step && infoParse.step === AllSteps.PRESENTATION)
      ) {
        const stepTracking = await usersInAcademicYear[0]
          .related('userHasDoc')
          .query()
          .where('step', infoParse.step)
          .orderBy('created_at', 'desc')
        if (stepTracking && stepTracking.length > 0) {
          console.log(body)

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
    } catch (errors) {
      // console.log(error)
      // if (
      //   error.message === 'no adDate' ||
      //   error.message === 'no compDate'
      //   // error.message === 'empty role'
      // ) {
      //   session.flash({
      //     error: 'All fields are required',
      //     type: 'negative',
      //   })
      // }
      console.log(errors)
      if (Array.isArray(errors)) {
        for (const error in errors) {
          session.flash({
            error: errors[error],
            type: 'negative',
            // key: 'tel',
          })
        }
        // response.redirect(
        //   `/student-information/${request.param('id')}?step=${AllSteps.TR02}&&mode=edit`
        // )
      } else {
        return response.status(400).json({ message: errors.message })
      }
      // return response.status(400).json({ message: error.message })
    }
  }
}
