import { DateTime } from 'luxon'
import Hash from '@ioc:Adonis/Core/Hash'
import {
  column,
  beforeSave,
  BaseModel,
  hasMany,
  HasMany,
  hasOne,
  HasOne,
  belongsTo,
  BelongsTo,
} from '@ioc:Adonis/Lucid/Orm'
import Post from 'App/Models/Post'
import Student from 'App/Models/Student'
import File from 'App/Models/File'
import AcademicYearConfig from 'App/Models/AcademicYearConfig'

export default class User extends BaseModel {
  @column({ isPrimary: true })
  public user_id: string

  @column()
  public firstname: string

  @column()
  public lastname: string

  @column()
  public email: string

  @column({ serializeAs: null })
  public password: string

  @column()
  public role: string

  @column()
  public approved: boolean

  @hasMany(() => Post)
  public posts: HasMany<typeof Post>

  @column()
  public conf_id: number

  @belongsTo(() => AcademicYearConfig)
  public academicYearConfig: BelongsTo<typeof AcademicYearConfig>

  @column()
  public rememberMeToken?: string

  @hasMany(() => File, { foreignKey: 'file_id' })
  public files: HasMany<typeof File>

  @hasOne(() => Student, { foreignKey: 'student_id' })
  public student: HasOne<typeof Student>

  // @hasOne(() => Student, { foreignKey: 'adviser_id' })
  // public student_adviser: HasOne<typeof Student>

  @hasMany(() => Student, { foreignKey: 'adviser_id' })
  public student_adviser: HasMany<typeof Student>

  @column.dateTime({ autoCreate: true })
  public created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updated_at: DateTime

  @beforeSave()
  public static async hashPassword(user: User) {
    if (user.$dirty.password) {
      user.password = await Hash.make(user.password)
    }
  }
}
