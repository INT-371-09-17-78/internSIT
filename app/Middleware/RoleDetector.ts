import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class RoleDetector {
  public async handle({ auth, response }: HttpContextContract, next: () => Promise<void>) {
    // code for middleware goes here. ABOVE THE NEXT CALL
    if (
      auth.user?.role === 'staff' ||
      auth.user?.role === 'advisor' ||
      auth.user?.role === 'admin'
    ) {
      await next()
    } else {
      response.redirect('/')
      // response.status(401).send('permission denied')
    }
  }
}
