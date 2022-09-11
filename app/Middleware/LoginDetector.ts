import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'

export default class LoginDetector {
  public async handle({ auth, response }: HttpContextContract, next: () => Promise<void>) {
    // code for middleware goes here. ABOVE THE NEXT CALL
    if (auth.user) {
      await next()
    } else {
      response.status(401).send('permission denied')
    }
  }
}
