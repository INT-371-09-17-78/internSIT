import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'
import LdapAuth from 'ldapauth-fork'

export default class UsersController {
  public async index() {
    return await User.all()
  }
  public async store() {
    return await User.create({
      username: 'virk',
      password: 'virk@adonisjs.com',
    })
  }
  public async show({ params }: HttpContextContract) {
    return await User.find(params.id)
  }
  public async verify({ auth, request, response, session }): Promise<HttpContextContract> {
    const { username, password } = request.only(['username', 'password'])
    let user: any
    try {
      if (username === 'admin') {
        await auth.attempt(username, password)
        return response.redirect('/announcement')
      } else {
        const ldapUser: any = await this.authenticate(username, password, 'staff')
        if (ldapUser) {
          console.log(ldapUser)
          user = await User.findBy('username', username)
          if (!user) {
            user = new User()
            user.username = username
            user.email = ldapUser.mail
            await user.save()
          }
        }
        await auth.login(user)
        return response.redirect('/announcement')
      }
    } catch (error) {
      session.flash({ message: 'Invalid creditials', type: 'negative' })
      return response.redirect('/login')
    }
  }

  public authenticate(username: string, password: string, _role: string = 'staff') {
    return new Promise((resolve, reject) => {
      const options = {
        url: 'ldaps://ld0620.sit.kmutt.ac.th',
        bindDN: 'uid=' + username + ',ou=People,ou={{role}},dc=sit,dc=kmutt,dc=ac,dc=th',
        bindCredentials: password,
        searchBase: 'ou=People,ou={{role}},dc=sit,dc=kmutt,dc=ac,dc=th',
        searchFilter: 'uid={{username}}',
      }
      const client = new LdapAuth(options)
      client.authenticate(username, password, (error, user) => {
        if (error) {
          reject(error)
        }
        resolve(user)
      })
    })
  }
}
