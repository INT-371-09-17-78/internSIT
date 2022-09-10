import { DateTime } from 'luxon'
import { column, BaseModel, belongsTo, BelongsTo, hasMany, HasMany } from '@ioc:Adonis/Lucid/Orm'
import User from 'App/Models/User'
import Document_Status from 'App/Models/DocumentStatus'

export default class Student extends BaseModel {
  @column({ isPrimary: true })
  public student_id: string

  @column()
  public department: string

  @column()
  public position: string

  @column()
  public company: string

  @column()
  public plan: number

  @column()
  public tel: string

  // @column()
  // public email: string

  @column.date()
  public start_date: DateTime

  @column.date()
  public end_date: DateTime

  @column()
  public mentor_name: string

  @column()
  public mentor_email: string

  @column()
  public mentor_tel_no: string

  @column()
  public mentor_position: string

  // @column()
  // public study: string

  // @column()
  // public status: string

  // @column()
  // public reasons: string

  @hasMany(() => Document_Status, { foreignKey: 'student_id' })
  public document_status: HasMany<typeof Document_Status>

  // @column()
  // public rememberMeToken?: string

  @belongsTo(() => User)
  public user: BelongsTo<typeof User>
  // @column()
  // public user_id: string

  @column()
  public adviser_id: string
  // @hasMany(() => Post, { foreignKey: 'student_id' })
  // public posts: HasMany<typeof Post>

  @column.dateTime({ autoCreate: true })
  public created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updated_at: DateTime

  // @beforeSave()
  // public static async hashPassword(student: Student) {
  //   if (student.$dirty.password) {
  //     student.password = await Hash.make(student.password)
  //   }
  // }
}
