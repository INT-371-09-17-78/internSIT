import { DateTime } from 'luxon'
import Hash from '@ioc:Adonis/Core/Hash'
import { column, beforeSave, BaseModel, hasMany, HasMany } from '@ioc:Adonis/Lucid/Orm'
import Post from 'App/Models/Post'
export default class Student extends BaseModel {
  @column({ isPrimary: true})
  public student_id: number

  @column()
  public firstname: string

  @column()
  public lastname: string

  @column()
  public email: string

  @column({ serializeAs: null })
  public password: string

  @column()
  public department: string

  @column()
  public position: string

  @column()
  public company: string

  @column()
  public duration: number

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
  public rememberMeToken?: string

  @hasMany(() => Post,{foreignKey: 'student_id'})
  public posts: HasMany<typeof Post>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime

  @beforeSave()
  public static async hashPassword(student: Student) {
    if (student.$dirty.password) {
        student.password = await Hash.make(student.password)
    }
  }
}
