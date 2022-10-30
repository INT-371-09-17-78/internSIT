import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, HasMany } from '@ioc:Adonis/Lucid/Orm'
import File from 'App/Models/File'

export default class UserHasDoc extends BaseModel {
  public static table = 'users_has_docs'

  @column({ isPrimary: true })
  public id: number

  @column()
  public doc_stat_id: string

  @column()
  public user_in_academic_year_id: string

  @hasMany(() => File, { foreignKey: 'id' })
  public files: HasMany<typeof File>

  @column()
  public advisor_date: DateTime

  @column()
  public student_date: DateTime

  @column()
  public meeting_link: string

  @column()
  public supervision_status: string

  @column()
  public advisor_comment: string

  @column()
  public date_confirm_status: string

  // table.dateTime('advisor_date').nullable()
  //     table.dateTime('student_date').nullable()
  //     table.string('meeting_link').nullable()
  //     table.string('supervision_status').nullable()

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
