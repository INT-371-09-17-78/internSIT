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
} from '@ioc:Adonis/Lucid/Orm'
import Post from 'App/Models/Post'
import Student from 'App/Models/Student'

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
  public rememberMeToken?: string

  @hasMany(() => Post, { foreignKey: 'user_id' })
  public posts: HasMany<typeof Post>

  @hasOne(() => Student, { foreignKey: 'student_id' })
  public student: HasOne<typeof Student>

  @hasOne(() => Student, { foreignKey: 'adviser_id' })
  public student_adviser: HasOne<typeof Student>

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
