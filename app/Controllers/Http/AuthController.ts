import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
export default class AuthController {
  //login
  public async login({ request, response, auth, session }): Promise<HttpContextContract> {
    // console.log(request);
    
    const { uid, password } = request.only(['uid', 'password'])
    try {
      console.log(uid , password);
      
      await auth.login(uid, password)
    } catch (error) {
      console.log(error);
      session.flash('error', 'Your email or password is incorrect')
    }
    return response.redirect('/')
  }

  public async logout({ response, auth }): Promise<HttpContextContract> {
    await auth.logout()

    return response.redirect().toRoute('auth.login.show')
  }
}
