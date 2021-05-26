require('dotenv').config()
const express = require('express')
const flash = require('express-flash')
const session = require('express-session')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const fs = require('fs')
const FileReader = require('./fileReader')
const multer = require('multer')

const UserRouter = require('./router/UserRouter')

const e = require('express')
const { Console } = require('console')

const app = express()
app.set('view engine', 'ejs')
app.use(bodyParser.urlencoded({extended: false}))
app.use(cookieParser('nvm'));
app.use(session({ cookie: { maxAge: 600000 }}));
app.use(flash());

const uploader = multer({dest: __dirname + '/uploads/'})

app.use((req, res, next) => {
    req.vars = {root: __dirname}
    next()
})

app.use('/user', UserRouter)

const getCurrentDir = (req, res, next) => {
    if (!req.session.user) {
        // chưa đăng nhập
        return next();
    }

    const {userRoot} = req.session.user
    let {dir} = req.query
    if (dir === undefined) {
        dir = ''
    }

    let currentDir =`${userRoot}/${dir}`
    if (!fs.existsSync(currentDir)) {

        currentDir = userRoot
    }

    req.vars.currentDir = currentDir
    req.vars.userRoot = userRoot 
    next();  
}

app.get('/', getCurrentDir, (req, res) =>{
    if (!req.session.user) {
        return res.redirect('/user/login')
    }

    let {userRoot, currentDir} = req.vars
    // console.log('cần nạp thư mục: ' + currentDir);

    FileReader.load(userRoot, currentDir)
    .then(files => {
        
        const user = req.session.user
        res.render('index', {user, files})
    })

})

app.post('./upload', uploader.single('attachment'), (req, res) => {
    
    const {email, path} = req.body
    const file = req.file

    if (!email || !path || !file) {
        return res.json({code: 1, message: ' Thông tin không hợp lệ'})
    }

    const {root} = req.vars
    const currentDir = `${root}/users/${email}/${path}`

    if (!fs.existsSync(currentDir)) {
        return res.json({code: 2, message: 'Đường dẫn cần lưu không đúng'})
    }

    let name = file.originalname
    let newPath = currentDir + '/' + name

    fs.renameSync(file.path, newPath)
    
    return res.json({code: 0, message: 'Upload thành công, đã lưu tại ' + newPath})
})

const port = process.env.PORT || 9090
app.listen(port, () => console.log(`http://localhost:${port}`))