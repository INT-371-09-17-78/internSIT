import { DateTime } from 'luxon'
import {
  BaseModel,
  column,
  hasMany,
  HasMany,
  // manyToMany,
  // ManyToMany,
  // belongsTo,
  // BelongsTo,
  hasOne,
  HasOne,
} from '@ioc:Adonis/Lucid/Orm'
import Post from 'App/Models/Post'
import UserHasDoc from 'App/Models/UserHasDoc'
import Student from 'App/Models/Student'
// import stepsStatuses from 'App/Models/StepStatus'
// import File from 'App/Models/File'
// import Advisor from 'App/Models/Advisor'
import Advisor from 'App/Models/Advisor'
import Staff from 'App/Models/Staff'

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

  // @manyToMany(() => stepsStatuses, {
  //   localKey: 'id',
  //   pivotForeignKey: 'user_in_academic_year_id',
  //   relatedKey: 'id',
  //   pivotRelatedForeignKey: 'step_status_id',
  //   pivotTable: 'users_has_docs',
  //   pivotTimestamps: true,
  // })
  // //   public skills: ManyToMany<typeof Skill>
  // public stepsStatuses: ManyToMany<typeof stepsStatuses>

  @hasOne(() => Student, { foreignKey: 'student_id' })
  public student: HasOne<typeof Student>

  @hasOne(() => Advisor, { foreignKey: 'advisor_id' })
  public advisor: HasOne<typeof Advisor>

  @hasOne(() => Staff, { foreignKey: 'staff_id' })
  public staff: HasOne<typeof Staff>

  @column()
  public advisor_ac_id: number

  @hasMany(() => UserHasDoc, { foreignKey: 'user_in_academic_year_id' })
  public userHasDoc: HasMany<typeof UserHasDoc>
  // @belongsTo(() => UsersInAcademicYear)
  // public usersInAcademicYear: BelongsTo<typeof UsersInAcademicYear>

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
