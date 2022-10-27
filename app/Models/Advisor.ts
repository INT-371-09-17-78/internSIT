import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, BelongsTo, hasMany, HasMany } from '@ioc:Adonis/Lucid/Orm'
import User from 'App/Models/User'
import Student from 'App/Models/Student'
import UsersInAcademicYear from 'App/Models/UsersInAcademicYear'

export default class Advisor extends BaseModel {
  // @column({ isPrimary: true })
  // public id: number

  @column({ isPrimary: true })
  public advisor_id: string

  @belongsTo(() => User)
  public user: BelongsTo<typeof User>

  @hasMany(() => UsersInAcademicYear)
  public UsersInAcademicYear: HasMany<typeof UsersInAcademicYear>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
