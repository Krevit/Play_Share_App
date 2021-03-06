const jwt = require('jsonwebtoken')
const CryptoJS = require("crypto-js");
const User = require('../model/User')
const APP_EXPORTS = require('../app')

exports.checkOrigin = (req,res,next) =>                                                                       
{
    console.log(APP_EXPORTS.CLIENT_URL)
    // if (res.headers.origin != APP_EXPORTS.CLIENT_URL) {
    //     console.log(`Request tnot made from Client! Only ${APP_EXPORTS.CLIENT_URL} can Access API!`)
    //     return res.status(401).json({status:-1, message:`Request tnot made from Client! Access Denied`}).end()
    // } 
    // const origin = req.get('host')
    // console.log(origin)
    next()
}
exports.verifyUser = async (req,res,next) =>                                                                                        // MiddleWare: Private Unique User Route
{                                                                              
    const user = await User.findOne({username: req.originalUrl.split('/')[3]})
    const recieved_token = req.headers['auth-token'] 
    // const auth_header = req.headers['authorization']
    // const recieved_token = auth_header && auth_header.split(' ')[1]

    if(!recieved_token || !user ) 
        return res.status(401).json({status: -1, message: `Access Denied! Wrong auth-token Header, user not found, or user not logged in!`}) 
          
    // VERIFY the user by checking if correct JWT 
    let verified = null
    try{
        try{
            verified = jwt.verify(recieved_token, process.env.USER_SECRET_KEY)                                                      // See if a right user is trying to access this router
        }                       
        catch(err){
            try{
                verified = jwt.verify(recieved_token, process.env.ADMIN_SECRET_KEY)                                                 // See if if the admin is trying to access this router
            }            
            catch{
                throw err
            }                                                                                                        // If neither the admin or the right user, throw error        
        }
        req.jwtPayload = verified                                                                                                         // req.jwtPayload = JWT payload
        if (verified.username != user.username)
            return res.status(401).json({status: -1, message: "Access Denied! Invalid User!"})  
        next()
    }
    catch(err){
        return res.status(400).json({status: -1, message: "Access Denied! Invalid Token! Error: " + err}) 
    }
    next()
}














/* Admin In DEV
exports.verifyAdmin = async (req,res,next) => {                                                                             // MiddleWare: Private Admin Route
    const userType = req.baseUrl.split('/')[2]                                                                              // Get the user type: admin or user
    const user = await User.findOne({username: "admin"})
    const encryption_input = (user._id+user.email+user.username+user.password).toString()

    const recieved_token = req.header('auth-token')                                                                // 1) Get the token from the header  of the request
    if(!recieved_token) 
        return res.status(401).json({status: -1, message: "Access Denied! No auth-token Header"})   
    const bytes = CryptoJS.AES.decrypt(recieved_token, process.env.CLIENT_ENCRYPTION_KEY);                         // DECRYPT TOKEN
    const recieved_token = bytes.toString(CryptoJS.enc.Utf8);
    
    const bytes_token = CryptoJS.AES.decrypt(encryption_input, process.env.USER_SECRET_KEY);                             // DECRYPT USER
    const user_secret_key = bytes_token.toString(CryptoJS.enc.Utf8);    // salted hashed secret key is stored in db. can create the prehash code using user data + .env key. So if we cant calcumlate the hash stored in db with this, then wrong user               

    const unique_user_secret_key = await bcrypt.hash(encryption_input, process.env.USER_SECRET_KEY)      
    try{
        let verified = null
        if (userType === "admin") 
            verified = jwt.verify(recieved_token, process.env.ADMIN_SECRET_KEY+unique_user_secret_key)                      // 2) (returns _id doc of verified user in DB) Verify the user by checkign to see if the tokens in header with otu secret token
        else{throw err}
        req.user = verified                                                                                                 // 3) req.user = JWT object
        next()
    }
    catch(err){
        return res.status(400).json({status: -1, message: "Invalid Token Error: " +err})                                    // If wrong JWT token, will throw an error
    }
}
*/
