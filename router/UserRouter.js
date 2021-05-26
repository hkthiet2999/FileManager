const express = require('express')
const {check, validationResult} = require('express-validator')
const db = require('../db')
const bcrypt = require('bcrypt')
const fs = require('fs')

const Router = express.Router()

Router.get('/login', (req, res) =>{

    if (req.session.user) {
        return res.redirect('/')
    }

    const error = req.flash('error') || ''
    const password = req.flash('name') || ''
    const email = req.flash('email') || ''

    res.render('login', {error, password, email})
})

const loginValidator = [

    check('email').exists().withMessage('Vui lòng nhập email người dùng')
    .notEmpty().withMessage('Không được để trống email người dùng')
    .isEmail().withMessage('Đây không phải là 1 email hợp lệ'),

    check('password').exists().withMessage('Vui lòng nhập mật khẩu')
    .notEmpty().withMessage('Không được để trống mật khẩu')
    .isLength({min: 6}).withMessage('Mật khẩu phải từ 6 ký tự'),
]
Router.post('/login', loginValidator, (req, res) =>{
    let results = validationResult(req)
    if (results.errors.length === 0){
        const {email, password} = req.body
        

        const sql = 'SELECT * FROM account WHERE email = ?'
        const params = [email]
        
        db.query(sql, params, (err, results, fields) => {
            if(err) {
                req.flash('error', err.message)
                req.flash('password', password)
                req.flash('email', email)
                return res.redirect('/user/login')
            }else if(results.length === 0) {
                req.flash('error', 'Email không tồn tại')
                req.flash('password', password)
                req.flash('email', email)
                return res.redirect('/user/login')
            }
            else {
                const hased = results[0].password
                const match = bcrypt.compareSync(password, hased)
                
                if(!match) {
                    req.flash('error', 'Sai email hoặc password')
                    req.flash('password', password)
                    req.flash('email', email)
                    return res.redirect('/user/login')                 
                }else {
                    
                    let user = results[0]
                    user.userRoot = `${req.vars.root}/users/${user.email}`
                    req.session.user = user
                    
                    req.app.use(express.static(user.userRoot))

                    return res.redirect('/')
                }
            
            }
        })
    }
    else {
        results = results.mapped()

        let message;
        for (fields in results){
        message = results[fields].msg
        break;
    }

        const{email, password} = req.body

        req.flash('error', message)
        req.flash('password', password)
        req.flash('email', email)

        res.redirect('/user/login')
    }

})

Router.get('/logout', (req, res) =>{
    req.session.destroy()
    res.redirect('/user/login')
})

Router.get('/register', (req, res) =>{
    const error = req.flash('error') || ''
    const name = req.flash('name') || ''
    const email = req.flash('email') || ''

    res.render('register', {error, name, email})
})
const registerValidator = [
    check('name').exists().withMessage('Vui lòng nhập tên người dùng')
    .notEmpty().withMessage('Không được để trống tên người dùng')
    .isLength({min: 6}).withMessage('Tên người dùng phải từ 6 ký tự'),

    check('email').exists().withMessage('Vui lòng nhập email người dùng')
    .notEmpty().withMessage('Không được để trống email người dùng')
    .isEmail().withMessage('Đây không phải là 1 email hợp lệ'),

    check('password').exists().withMessage('Vui lòng nhập mật khẩu')
    .notEmpty().withMessage('Không được để trống mật khẩu')
    .isLength({min: 6}).withMessage('Mật khẩu phải từ 6 ký tự'),

    check('rePassword').exists().withMessage('Vui lòng nhập xác nhận mật khẩu')
    .notEmpty().withMessage('Vui lòng nhập xác nhận mật khẩu người dùng')
    .custom((value, {req}) => {
        if(value !== req.body.password) {
            throw new Error('Mật khẩu không khớp')
        }
        return true;
    })
]
Router.post('/register', registerValidator, (req, res) =>{
    let results = validationResult(req)

    if (results.errors.length === 0){
        const {name, email, password} = req.body
        const hased = bcrypt.hashSync(password, 10)
        
        const sql = 'insert into account(name, email, password) values(?,?,?)'
        const params = [name, email, hased]

        db.query(sql, params, (err, results, fields) => {
            if(err) {
                req.flash('error', err.message)
                req.flash('name', name)
                req.flash('email', email)
                return res.redirect('/user/register')
            }
            else if (results.affectedRows === 1) {
                const {root} = req.vars
                const userDir = `${root}/users/${email}`

                fs.mkdir(userDir, () => {
                    return res.redirect('/user/login')
                })                
            }
            else {
                req.flash('error', 'Đăng ký thất bại')
                req.flash('name', name)
                req.flash('email', email)
                return res.redirect('/user/register')
            }   
        })

    }
    else{
        results = results.mapped()
        console.log(results)
        let message;
        for (fields in results){
        message = results[fields].msg
        break;
    }

        const{name, email, password} = req.body

        req.flash('error', message)
        req.flash('name', name)
        req.flash('email', email)

        res.redirect('/user/register')
    }
    
})


module.exports = Router