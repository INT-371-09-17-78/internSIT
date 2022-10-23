import { column, BaseModel } from '@ioc:Adonis/Lucid/Orm'
import { DateTime } from 'luxon'

export default class AcademicYearConfig extends BaseModel {
  @column({ isPrimary: true })
  public acedemic_year: string

  @column.dateTime({ autoCreate: true })
  public created_at: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updated_at: DateTime
}
