import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, HasMany } from '@ioc:Adonis/Lucid/Orm'
import User from 'App/Models/User'

export default class AcademicYearConfig extends BaseModel {
  @column({ isPrimary: true })
  public conf_id: number

  @column()
  public academic_year: number

  @hasMany(() => User, { foreignKey: 'conf_id' })
  public users: HasMany<typeof User>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
