import User from 'App/Models/User'
import File from 'App/Models/File'
import { Steps4Month, Steps2Month, Steps6Month } from 'Contracts/enum'
import AcademicYear from 'App/Models/AcademicYear'

export default class StepsServices {
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

  public findStepEdit(month, step, m2, m4, m6) {
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

  public async addTemplateFiletoStepMonth(stepMonth, month) {
    const AcademicYearCf = await AcademicYear.query().orderBy('updated_at', 'desc')
    for (let i = 0; i < stepMonth.length; i++) {
      stepMonth[i]['templateFile'] = []

      const templateFileQuery =
        'template' + month + stepMonth[i].name + AcademicYearCf[0].academic_year
      const templateFile = await File.query().where('step_file_type', templateFileQuery)

      if (templateFile && templateFile.length > 0) {
        for (let k = 0; k < templateFile.length; k++) {
          stepMonth[i]['templateFile'].push(templateFile[k].serialize())
        }
      }
    }
    return stepMonth
  }

  public showSteps(month) {
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
              description:
                'เอกสารรายงานความก้าวหน้าประจำสัปดาห์ของแต่ละเดือน (TR-03) และ เอกสารรายงานความก้าวหน้าประจำเดือน (TR-05) และเอกสารสำหรับการนิเทศ (Supervision)',
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

  public async gen() {
    try {
      let year: any
      const users = await User.all()
      if (users && users.length === 0) {
        const currentYear = await AcademicYear.query().orderBy('updated_at', 'desc')
        if (!currentYear || currentYear.length === 0) {
          year = await AcademicYear.create({
            academic_year: new Date().getFullYear().toString(),
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
        await User.createMany(arr)
        // const usersArr =
        // usersArr.forEach(
        //   async (user) =>
        //     user.role === 'staff'
        //       ? await user.related('staff').create({})
        //       : // ,
        //         // await year.related('users').attach([user.user_id]))
        //         await user.related('advisor').create({})
        //   // ,
        //   // await year.related('users').attach([user.user_id]))
        // )
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

  public validatePhoneNumber(input_str) {
    const re = /^\(?(\d{3})\)?[- ]?(\d{3})[- ]?(\d{4})$/

    return re.test(input_str)
  }

  public validateEmail(mail) {
    const re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/

    return re.test(mail)
  }

  public semesterPlan(semester) {
    if (semester === 2) {
      return [4, 6]
    } else {
      return [2]
    }

    // return re.test(mail)
  }
}
