import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany, ManyToMany } from '@ioc:Adonis/Lucid/Orm'
import User from 'App/Models/User'

export default class AcademicYear extends BaseModel {
  // @column({ isPrimary: true })
  // public conf_id: number

  @column({ isPrimary: true })
  public academic_year: number

  @manyToMany(() => User, {
    localKey: 'academic_year',
    pivotForeignKey: 'academic_year',
    relatedKey: 'user_id',
    pivotRelatedForeignKey: 'user_id',
    pivotTable: 'users_in_academic_years',
    // pivotColumns: ['proficiency'],
    pivotTimestamps: true,
  })
  public users: ManyToMany<typeof User>

  @column()
  public status: boolean
  // @hasMany(() => User, { foreignKey: 'conf_id' })
  // public users: HasMany<typeof User>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
