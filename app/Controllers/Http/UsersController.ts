import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'
import Student from 'App/Models/Student'
import Adviser from 'App/Models/Adviser'
import Staff from 'App/Models/Staff'
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
    const { username, password, isRemember, role } = request.only([
      'username',
      'password',
      'isRemember',
      'role',
    ])
    let rememberMe: boolean = isRemember && isRemember === 'yes' ? true : false
    let ldRole: string = role === 'adviser' || role === 'staff' ? 'staff' : 'st'
    let user: any
    try {
      if (username === 'admin') {
        await auth.attempt(username, password, rememberMe)
        return response.redirect('/announcement')
      } else {
        const ldapUser: any = await this.authenticate(username, password, ldRole)
        const fullname = ldapUser.cn.split(' ')
        if (ldapUser) {
          switch (role) {
            case 'staff':
              user = await Staff.findBy('staff_id', username)
              if (!user) {
                user = new Staff()
                user.staff_id = ldapUser.uid
                user.firstname = fullname[0]
                user.lastname = fullname[1]
                user.email = ldapUser.mail
                user.password = password
                await user.save()
              }
              await auth.use('authStaff').login(user, rememberMe)
              break
            case 'adviser':
              user = await Adviser.findBy('adviser_id', username)
              if (!user) {
                user = new Adviser()
                user.adviser_id = ldapUser.uid
                user.firstname = fullname[0]
                user.lastname = fullname[1]
                user.email = ldapUser.mail
                user.password = password
                await user.save()
              }
              await auth.use('authAdviser').login(user, rememberMe)
              break
            default:
              user = await Student.findBy('student_id', username)
              // user = await User.findBy('username', username)
              if (!user) {
                user = new Student()
                user.student_id = ldapUser.uid
                user.firstname = fullname[0]
                user.lastname = fullname[1]
                user.email = ldapUser.mail
                user.password = password
                await user.save()
                // user = new User()
                // user.id = ldapUser.uid
                // user.username = username
                // // user.lastname = fullname[1]
                // user.email = ldapUser.mail
                // user.password = password
                // await user.save()
              }
              await auth.use('authStudent').login(user, rememberMe)
            // await auth.use('web').login(user, rememberMe)
          }
          // await auth.use('authStudent').authenticate()
          // console.log((auth.user));

          return response.redirect('/announcement')
        }
      }
    } catch (error) {
      console.log(error.message)

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

  public authenticate(username: string, password: string, role: string) {
    return new Promise((resolve, reject) => {
      const options: LdapOptions = {
        url: 'ldaps://ld0620.sit.kmutt.ac.th',
        bindDN: 'uid=' + username + ',ou=People,ou=' + role + ',dc=sit,dc=kmutt,dc=ac,dc=th',
        bindCredentials: password,
        searchBase: 'ou=People,ou=' + role + ',dc=sit,dc=kmutt,dc=ac,dc=th',
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
