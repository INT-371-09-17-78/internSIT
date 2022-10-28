import { DateTime } from 'luxon'
import {
  BaseModel,
  column,
  hasMany,
  HasMany,
  manyToMany,
  ManyToMany,
  belongsTo,
  BelongsTo,
} from '@ioc:Adonis/Lucid/Orm'
import Post from 'App/Models/Post'
import DocumentStatus from 'App/Models/DocumentStatus'
// import File from 'App/Models/File'
import Advisor from 'App/Models/Advisor'

export default class UsersInAcademicYear extends BaseModel {
  public static table = 'users_in_academic_years'
  @column({ isPrimary: true })
  public id: number

  @column()
  public academic_year: number

  @column()
  public user_id: string

  @hasMany(() => Post, { foreignKey: 'id' })
  public posts: HasMany<typeof Post>

  @column()
  public approved: boolean

  // @hasMany(() => File, { foreignKey: 'id' })
  // public files: HasMany<typeof File>

  @manyToMany(() => DocumentStatus, {
    localKey: 'id',
    pivotForeignKey: 'user_in_academic_year_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'doc_stat_id',
    pivotTable: 'users_has_docs',
    pivotTimestamps: true,
  })
  //   public skills: ManyToMany<typeof Skill>
  public documentStatus: ManyToMany<typeof DocumentStatus>

  @column()
  public advisor_id: string

  @belongsTo(() => Advisor)
  public advisor: BelongsTo<typeof Advisor>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
