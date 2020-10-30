"use strict"
require('dotenv').config({ path: '../.env' })                                                       // To use keys stored in .env file
const express  = require('express')
const mongoose = require('mongoose')
const cors     = require('cors')
const helmet = require("helmet")                                                                    // gives 13 middlewares to give various protections to application
const cookieParser = require('cookie-parser')                                                       // to parse cookie
const authRoutes   = require('./routes/auth')
const adminRoutes  = require('./routes/admin')
const userRoutes   = require('./routes/user')
const {verifyUser, verifyAdmin, verifyApp} = require('./helpers/verify_permissions')                                 // PRIVATE ROUTE MIDDLEWARE: Import the Private Routes Middleare      
const {decryptBody, decryptSelectedHeader, initiateCheckHandShake} = require('./helpers/Encrypt_Decrypt_Request')    // MIDDLEWARE to decrypt body
const app = express()
const client_url =  'http://localhost:3000'

app.use(cors(                                                                                       // Only accept requests from the specific client domain
    // {origin: client_url,
    // credentials: true}
));                                              
app.use(helmet())                                                                                   // helmet 11 middleware for protections
app.use(express.json())    
app.use(cookieParser())                                                                             // to parse cookies


app.get('/', (req,res,next) => {res.send(JSON.stringify("<h1>MY API SERVER from Node Cluster PID:"+process.pid+"</h1>"))}) 
// app.use('/', initiateCheckHandShake)                                                             // (Can disable when using HTTPS) Initilize TLS handshake and get client's Symmetric key       
// app.use('/api/auth', decryptBody, decryptSelectedHeader)                                         // (Can disable when using HTTPS) My MIDDLEWARES to decrypt body and some headers for login and request
app.use('/api/auth', authRoutes)                                                                    // Register new user, login user (only apps with access key can register or login)
app.use('/api/admin', verifyUser, adminRoutes)                                                      // PRIVATE ADMIN ROUTES
app.use('/api/user/:username', verifyUser, userRoutes)                                              // PRIVATE USER ROUTES   

const port = 8000
mongoose.connect(process.env.DB_CONNECT, { useUnifiedTopology: true, useNewUrlParser: true })
    .then( () => {
        app.listen(port, ()=> console.log(`CONNECTED TO DB!              http://localhost:${port}     PID: ${process.pid}`))
    })
    .catch((err) => {console.log("Connection Failed! " + err)})
    
