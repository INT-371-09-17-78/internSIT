import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'
// const LdapAuth = require('ldapauth-fork')
import LdapAuth from 'ldapauth-fork'

export default class UsersController {
    public async index() {
        return await User.all();
    }
    public async store() {
        return await User.create({
            username: 'virk',
            password: 'virk@adonisjs.com',
          })
    }
    public async show({params}:HttpContextContract) {
        return await User.find(params.id)
    }
    public async verify({auth,request,response,session}: HttpContextContract){
        const {username, password} = request.only(['username','password'])

        let user: any
        try {
            if(username=='admin'){
                await auth.use('web').attempt(username,password)
 
                response.redirect().toRoute('/home')
            } else {
                const ldap_user:any = await this.authenticate(username,password,'staff')
                console.log(ldap_user);
                if(ldap_user){
                    user = await User.findBy('username',username)
                    if(!user){
                        user = new User()
                        user.username = username
                        user.email = ldap_user.mail
    
                        await user.save()
                    }
                }
                await auth.use('web').login(user)
                response.redirect().toRoute('/home')
            }
        } catch (error) {
            console.log(error)
            session.flash({message:'Invalid creditials', type: 'negative'})
            response.redirect().toRoute('/login')
        }
    }
    public authenticate(username: string,password: string,role: string ='staff'){ 
        return new Promise( (resolve,reject) =>{
            const options = {
                'url': 'ldaps://ld0620.sit.kmutt.ac.th',
                'bindDN': 'uid='+username+',ou=People,ou=staff,dc=sit,dc=kmutt,dc=ac,dc=th',
                'bindCredentials': password,
                'searchBase': 'ou=People,ou=staff,dc=sit,dc=kmutt,dc=ac,dc=th',
                'searchFilter': 'uid={{username}}'
            }
            const client = new LdapAuth(options)
            client.authenticate(username,password, (error,user)=>{
                if(error){              
                    reject(error)
                }
                resolve(user)
            })
        })
    }
}
