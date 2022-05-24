import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'
import LdapAuth from 'ldapauth-fork'

interface LdapOptions {
  url: string
  bindDN: string
  bindCredentials: string
  searchBase: string
  searchFilter: string
}
export default class UsersController {
  public async index() {
    return await User.all()
  }
  public async store() {
    return await User.create({
      username: 'nuchanart.boo',
      password: 'Fxig08',
      email: 'nuchanart.boo',
    })
  }
  public async show({ params }: HttpContextContract) {
    return await User.find(params.id)
  }
  public async verify({ auth, request, response, session }: HttpContextContract) {
    console.log(request)
    const { username, password, isRemember } = request.only(['username', 'password', 'isRemember'])
    let rememberMe: boolean = false
    if (isRemember && isRemember === 'yes') {
      rememberMe = true
    } else {
      rememberMe = false
    }
    let user: any
    try {
      if (username === 'admin') {
        await auth.attempt(username, password, rememberMe)
        return response.redirect('/announcement')
      } else {
        const ldapUser: any = await this.authenticate(username, password, 'staff')
        if (ldapUser) {
          user = await User.findBy('username', username)
          if (!user) {
            user = new User()
            user.username = username
            user.email = ldapUser.mail
            user.password = password
            await user.save()
          }
        }
        await auth.login(user, rememberMe)
        return response.redirect('/announcement')
      }
    } catch (error) {
      if (error.message === 'no password given' || error.message === 'empty username') {
        session.flash({
          error: 'All fields are required',
          type: 'negative',
        })
      } else {
        session.flash({
          error: 'Invalid creditials',
          type: 'negative',
        })
      }
      return response.redirect('/')
    }
  }

  public authenticate(username: string, password: string, _role: string = 'staff') {
    return new Promise((resolve, reject) => {
      const options: LdapOptions = {
        url: 'ldaps://ld0620.sit.kmutt.ac.th',
        bindDN: 'uid=' + username + ',ou=People,ou=' + _role + ',dc=sit,dc=kmutt,dc=ac,dc=th',
        bindCredentials: password,
        searchBase: 'ou=People,ou=' + _role + ',dc=sit,dc=kmutt,dc=ac,dc=th',
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

  public async logout({ response, auth }: HttpContextContract) {
    await auth.logout()
    return response.redirect('/')
  }
}
