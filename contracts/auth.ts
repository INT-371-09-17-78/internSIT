/**
 * Contract source: https://git.io/JOdz5
 *
 * Feel free to let us know via PR, if you find something broken in this
 * file.
 */

import user from 'app/Models/User'
// import student from 'app/Models/Student'
// import adviser from 'app/Models/Adviser'
// import staff from 'app/Models/Staff'

declare module '@ioc:Adonis/Addons/Auth' {
  /*
  |--------------------------------------------------------------------------
  | Providers
  |--------------------------------------------------------------------------
  |
  | The providers are used to fetch users. The Auth module comes pre-bundled
  | with two providers that are `Lucid` and `Database`. Both uses database
  | to fetch user details.
  |
  | You can also create and register your own custom providers.
  |
  */
  interface ProvidersList {
    /*
    |--------------------------------------------------------------------------
    | User Provider
    |--------------------------------------------------------------------------
    |
    | The following provider uses Lucid models as a driver for fetching user
    | details from the database for authentication.
    |
    | You can create multiple providers using the same underlying driver with
    | different Lucid models.
    |
    */
    user: {
      implementation: LucidProviderContract<typeof user>
      config: LucidProviderConfig<typeof user>
    }
    // student: {
    //   implementation: LucidProviderContract<typeof student>
    //   config: LucidProviderConfig<typeof student>
    // }
    // adviser: {
    //   implementation: LucidProviderContract<typeof adviser>
    //   config: LucidProviderConfig<typeof adviser>
    // }
    // staff: {
    //   implementation: LucidProviderContract<typeof staff>
    //   config: LucidProviderConfig<typeof staff>
    // }
  }

  /*
  |--------------------------------------------------------------------------
  | Guards
  |--------------------------------------------------------------------------
  |
  | The guards are used for authenticating users using different drivers.
  | The auth module comes with 3 different guards.
  |
  | - SessionGuardContract
  | - BasicAuthGuardContract
  | - OATGuardContract ( Opaque access token )
  |
  | Every guard needs a provider for looking up users from the database.
  |
  */
  interface GuardsList {
    /*
    |--------------------------------------------------------------------------
    | Web Guard
    |--------------------------------------------------------------------------
    |
    | The web guard uses sessions for maintaining user login state. It uses
    | the `user` provider for fetching user details.
    |
    */
    web: {
      implementation: SessionGuardContract<'user', 'web'>
      config: SessionGuardConfig<'user'>
    }
    // authStudent: {
    //   implementation: SessionGuardContract<'student', 'authStudent'>
    //   config: SessionGuardConfig<'student'>
    // }
    // authAdviser: {
    //   implementation: SessionGuardContract<'adviser', 'authAdviser'>
    //   config: SessionGuardConfig<'adviser'>
    // }
    // authStaff: {
    //   implementation: SessionGuardContract<'staff', 'authStaff'>
    //   config: SessionGuardConfig<'staff'>
    // }
  }
}
