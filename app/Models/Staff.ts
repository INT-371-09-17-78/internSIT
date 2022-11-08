import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, BelongsTo } from '@ioc:Adonis/Lucid/Orm'
import UsersInAcademicYear from 'App/Models/UsersInAcademicYear'

export default class Staff extends BaseModel {
  // @column({ isPrimary: true })
  // public id: number

  @column({ isPrimary: true })
  public staff_id: string

  @belongsTo(() => UsersInAcademicYear)
  public usersInAcademicYear: BelongsTo<typeof UsersInAcademicYear>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
