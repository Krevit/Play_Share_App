const User = require('../model/User')
const Token = require('../model/Token')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const CryptoJS = require("crypto-js");
const {registerValidation, loginValidationUsername} = require('../model/ValidationSchema')                                                                  // Import the Joi Validation functions
const {SYMMETRIC_KEY_encrypt} = require('../helpers/Encrypt_Decrypt_Request')
const JWT_expire_time = '10m'
const JWT_RT_expire_time = 24*60*60*15  //'15d'                        
const RT_cookie_expire_time_sec = '20d' 
const {REDIS_CLIENT} = require('../helpers/redis_db')


// function to create new JWT
async function createJWT(req, res, next, username, email) {               
    const JWT_payload = {id: username.toString()}                                                                                          
    let token = null
    if (email === process.env.ADMIN_EMAIL){
        try{    
            const JWT_admin_key = CryptoJS.AES.encrypt(process.env.USER_SECRET_KEY, process.env.ADMIN_SECRET_KEY).toString();                               // encrypt USER_SECRET_KEY with ADMIN_SECRET_KEY 
            token = jwt.sign(JWT_payload, JWT_admin_key, {expiresIn: JWT_expire_time})                                                                      // Admin Token uses an encryption of USER_SECRET_KEY with ADMIN_SECRET_KEY 
        }
        catch (err){
            console.log('FAILED to to make admin encryption key for JWT creation for admin failed!')
            // return res.status(400).json({status:-1, message: "FAILED to to make admin encryption key for JWT creation for admin failed!: Error:" + err}).end()
            throw "CreateJWT Error - FAILED to to make admin encryption key for JWT creation for admin failed!: Error:" + err
        }
    }
    else{
        token = jwt.sign(JWT_payload, process.env.USER_SECRET_KEY, {expiresIn: JWT_expire_time})                                                            // User JWT is simple, just encrypt with USER_SECRET_KEY 
    }
    return token
}
// function to create new refresh token
function createStoreRefreshToken(req, res, next, username, email) {               
    const refresh_token = jwt.sign({username: username, email: email}, process.env.REFRESH_TOKEN_SECRET, { expiresIn: JWT_RT_expire_time})
    // Saving Refresh token to Redis Cache
    REDIS_CLIENT.set(refresh_token, username, 'EX', JWT_RT_expire_time, (err) =>{                                     // set refresh token in redis cache as a key. no value. 
        if (err){
            console.log("CreateStoreRefreshToken: "+err)
            throw "CreateStoreRefreshToken Error - FAILED to add Refresh Token to Redis Cache. Err: "+err
        }
    })                   
    return refresh_token
}


// Input Fields: display_name, username, email, password
exports.registerNewUser = async (req,res,next) =>                                                                       
{
    // 1a) VALIDATE the POST request: See if it adhears to the rules of the schema     
    const {username, email, password} = req.body
    console.log(email)
    const {error} = registerValidation(req.body)                                                                                                      
    if(error){ return res.status(400).json({status:-1, message: "Joi Validation Error: " + error.details[0].message}).end() }
    // 1b) VALIDATE the POST request: See if user and email already exists in DB
    const user_exists  = await User.findOne({username: username})                                                                           
    const email_exists = await User.findOne({email: email})
    if (user_exists || email_exists)   
        return res.status(400).json( {status: -1, message: "This Username or Email Address is Already Registered!" } ).end() 
    // 1c) HASH THE PASSWORD FOR STORAGE!    leave salt as 10 and every year increase it by 1 to make cracking uyr passwords difficult
    const salt = await bcrypt.genSalt(process.env.SALT_NUMBER)                                                                             
    let hashed_password = null
    try{  hashed_password = await bcrypt.hash(password, salt)}
    catch{ return res.status(401).json( {status: -1, message: "Failed to hash password!" } ).end()}
    // 2) CAN NOW ADD USER: Populate the Mongoose Schema to push to the Post collection in the DB
    const new_user = new User({                                                                                                             
        username: username,
        handle: "@"+username, 
        // display_name: username,                                                                                                          // disabeld for now                                                                                      
        email: email,
        password: hashed_password,
    })        
    // 3) Add the user to the DB       
    let added_user = null                                                                                                                                                                            
    try{ added_user = await new_user.save()}
    catch(err){ return res.status(400).json({status: -1, message:"Error adding user to DB: " + err}).end()} 
    try{
        console.log("registered: "+added_user.username)
        return res.status(200).json( {status: 1, added_user: added_user}.end())
    }
    catch(err){  return res.status(400).json({status: -1, message:"Error Encrypting db user id to send to client. Error: " + err}).end()} 
}

/*  Input Fields: username, password
    Will generete a JWT using a secret key, string to hash in token, expiration time
        data - id of token = string of username
        secret key for users = AES(JWT_payload, USER_SECRET_KEY)
        secret key for admin = AES(AES(JWT_payload, USER_SECRET_KEY),ADMIN_SECRET_KEY) 
    * JWT_payload: {id: user.username}
    * user token = jwt.sign(JWT_payload, USER_SECRET_KEY, {expiresIn: '1h'})    
    * admin token = jwt.sign(JWT_payload, JWT_admin_key,   {expiresIn: '1h'})   -----  JWT_admin_key = encrypt USER_SECRET_KEY with ADMIN_SECRET_KEY */
exports.login = async (req,res,next) => 
{    
    // 1a) VALIDATE the POST request: See if it adhears to the rules of the schema
    const {username, password} = req.body
    const {error} = loginValidationUsername(req.body)                                                                                       
    if(error) 
        return res.status(400).json({status:-1, message: error.details[0].message}).end() 
    // 1b) VALIDATE the POST request: See if user and email already exists in DB    Find the user doc in DB with this email
    const user = await User.findOne({username: username})                                                                                   
    if (!user) 
        return res.status(401).json( {status: -1, message: "Invalid username or password"} ).end() 
    // 1c) CHECK PASSWORD on DB:
    try{                                                                                                                                    
        const valid_pass = await bcrypt.compare(password, user.password)                                                                    // CHECK PASSWORD: Compare if the passed in pas and the hashed db pass are the same
        if(!valid_pass){ return res.status(401).json( {status: -1, message: "Invalid username or password"} ).end() }
    }
    catch(err){
        return res.status(400).json( {status: -1, message:"Error: " + err} ).end()
    }
    // 2) CREATE + ASSIGN TOKEN So User Can Access Private Routes (admin secret is set in .env, user secret is uniquely generated)
    // 3) Change logged in status for user
    let token, refresh_token
    try{
        [token, refresh_token] = await Promise.all([
            createJWT(req, res, next, user.username,  user.email),
            createStoreRefreshToken(req, res, next, user.username, user.email),   
            User.updateOne({ _id: user._id }, {login_status: 1})    
        ]);                                        
    }
    catch(err){
        return res.status(400).json({status:-1, message: "Either failed to create JWT, create and store refresh token, or update login status of user! Error: "+err}).end()
    }

    // 4) Set refresh token cookie
    res.cookie('refresh_token', refresh_token, {
        maxAge: parseInt(RT_cookie_expire_time_sec),
        httpOnly: true,
        sameSite: 'strict', 
        // secure: true,
    });
    console.log("*** SET COOKIE SECURE FLAG TO TRUE SO WHEN CLIENT USES HTTPS")
    // 5) Encrypt (if TLS handshake in effect - just for practice, not needed) the JWT token and set it in the header
    const token_enc = SYMMETRIC_KEY_encrypt(token, req.headers["handshake"])                                                                
    res.set('auth-token', token_enc)                                                                                                        // Send the token with the response
    console.log("***WARNING! sending auth-token in res body. had issues reading header from react")
    console.log(token_enc)
    console.log("Logged In: " + user.username)
    return res.status(200).json( {status: 1, message: "Logged In! Set header 'auth-token' with token to access private routes!", auth_app: token_enc} ).end()
}


// mw to renew jwt and refresh token from old refresh token
exports.refresh = async (req,res,next) => {
    const old_refresh_token = req.get('refresh-token')
    if (!old_refresh_token){
        return res.status(401).json({status: -1, message: "No refresh-token sent, need to login"})
    }
    // 1) check if token in db 
    REDIS_CLIENT.exists(old_refresh_token, (err)=>{                                     // set refresh token in redis cache as a key. no value. 
        return res.status(401).json({status:-1, message: "Refresh Token not in DB, need to login again. Err: "+err})
    })                   
    // 2) check if token expired - if its expired, delete from db and return
    let RT_verified  
    try{
        RT_verified = jwt.verify(old_refresh_token, process.env.REFRESH_TOKEN_SECRET)
    }
    catch(err){ 
        REDIS_CLIENT.del(old_refresh_token, (err)=>{
            return res.status(401).json({status:-1, message: "Incorrect or Expired Refresh Token! Need to login again! Failed to delete old refresh token from redis cache!"}).end()
        })
        return res.status(401).json({status:-1, message: "Incorrect or Expired Refresh Token! Need to login again!"}).end()
    }
    // 3) Delete old RT, Make new jwt and RT from username and email stored in payload
    REDIS_CLIENT.del(old_refresh_token, (err)=>{
        return res.status(400).json({status:-1, message: "Failed to delete old RT from cache in successfull login!"}).end()
    })
    let new_jwt_token, new_refresh_token
    try{
        new_jwt_token = await createJWT(req, res, next, RT_verified.username)
        new_refresh_token = await createStoreRefreshToken(req, res, next, RT_verified.username, RT_verified.email) 
    }
    catch(err){
        return res.status(400).json({status:-1, message: err})
    }
    res.cookie('refresh_token', new_refresh_token, {
        maxAge: RT_cookie_expire_time_sec,
        httpOnly: true,
        sameSite: 'strict', 
        // secure: true,
    });
    console.log("*** SET COOKIE SECURE FLAG TO TRUE SO WHEN CLIENT USES HTTPS")
    console.log("***REMINDER: PUT JWT IN AUTH HEADER!!!")
    return res.status(200).json({status: 1, message: "Successfully refreshed JWT and refresh token", jwt: new_jwt_token})
}


