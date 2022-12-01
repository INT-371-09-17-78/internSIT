import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, HasMany, belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm'
import File from 'App/Models/File'
import usersInAcademicYear from 'App/Models/UsersInAcademicYear'
import { StepStatus, AllSteps } from 'Contracts/enum'

export default class UserHasDoc extends BaseModel {
  public static table = 'users_has_docs'

  @column({ isPrimary: true })
  public id: number

  // @column()
  // public step_status_id: number

  @column()
  public step: AllSteps

  @column()
  public status: StepStatus

  @column()
  public user_in_academic_year_id: number

  @hasMany(() => File, { foreignKey: 'id' })
  public files: HasMany<typeof File>

  @column()
  public advisor_date: Date

  @column()
  public student_date: Date

  @column()
  public meeting_link: string

  @column()
  public supervision_status: string

  @column()
  public advisor_comment: string

  @column()
  public no_approve_reason: string

  @column()
  public date_confirm_status: string

  @column()
  public is_adv_react: boolean

  @column()
  public is_signed: boolean

  @belongsTo(() => usersInAcademicYear)
  public usersInAcademicYear: BelongsTo<typeof usersInAcademicYear>

  // table.dateTime('advisor_date').nullable()
  //     table.dateTime('student_date').nullable()
  //     table.string('meeting_link').nullable()
  //     table.string('supervision_status').nullable()

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
