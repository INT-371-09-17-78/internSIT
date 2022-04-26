import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
export default class AuthController {
  //login
  public async login({ request, response, auth, session }): Promise<HttpContextContract> {
    const { uid, password } = request.only(['uid', 'password'])
    try {
      await auth.attempt(uid, password)
    } catch (error) {
      session.flash('error', 'Your email or password is incorrect')
    }
    return response.redirect('/')
  }

  public async logout({ response, auth }): Promise<HttpContextContract> {
    await auth.logout()

    return response.redirect().toRoute('auth.login.show')
  }
}
