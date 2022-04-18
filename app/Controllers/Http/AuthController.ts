import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { schema, rules } from '@ioc:Adonis/Core/Validator'
import User from 'App/Models/User'

export default class AuthController {
  //register
  public async register({ request, response, auth }): Promise<HttpContextContract> {
    const userSchema = schema.create({
      username: schema.string({ trim: true }, [
        rules.unique({ table: 'users', column: 'username', caseInsensitive: true }),
      ]),
      email: schema.string({ trim: true }, [
        rules.email(),
        rules.unique({ table: 'users', column: 'email', caseInsensitive: true }),
      ]),
      password: schema.string({}, [rules.minLength(8)]),
    })

    const data = await request.validate({ schema: userSchema })

    const user = await User.create(data)
    await auth.login(user)

    return response.redirect('/')
  }
  //login

  public async login({ request, response, auth, session }): Promise<HttpContextContract> {
    const { uid, password } = request.only(['uid', 'password'])
    try {
      await auth.attempt(uid, password)
    } catch (error) {
      session.flash('error', 'Your email or password is incorrect')
      return response.redirect().back()
    }
    return response.redirect('/')
  }

  public async logout({ response, auth }): Promise<HttpContextContract> {
    await auth.logout()

    return response.redirect().toRoute('auth.login.show')
  }
}
