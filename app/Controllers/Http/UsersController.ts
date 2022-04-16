import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import User from 'App/Models/User'

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
}
