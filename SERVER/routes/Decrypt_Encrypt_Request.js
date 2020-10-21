// Middleware to decrypt request fields with 
const NodeRSA = require('node-rsa');
const key = new NodeRSA({b: 1024});                     // PUBLIC + PRIVATE KEY MADE - len of the bytes
const public_key = key.exportKey('public')          // public key ------> sendout
const private_key = key.exportKey('private')        // private key
let SYMMETRIC_KEY = null;
const RSA_private_key = new NodeRSA(private_key)
const encrypted_headers = [
    // "auth-app", 
    "auth-token"
]

exports.initiateCheckHandShake =  (req,res,next) => {
    // Handshake was done so can decrypt client data with SYMMETRIC_KEY
    if (req.headers["hand-shake"] == 1){                    // handshake already performed, so its only to decrypt
        res.set('hand-shake', 1) 
        console.log("ok")
        next()
    }
    // 1) Client making 1st request, giving them public_key 
    else if (req.headers["hand-shake"] == null){
        res.set({
            'pub-key': Buffer.from(public_key).toString('base64'),
            'hand-shake': 0
        })
        return res.status(200).json({status:0, message: "Giving client the base64 encoded Public Key in 'pub-key' header. Respond with headers: 'hand-shake' = 0, key = base64(public_key_encypt(SYMMETRIC_KEY))"})  
    }
    // 2) clint needs to return body: key=public_key_enc(SYMMETRIC_KEY). header: hand-shake=1. 
    else if (req.headers["hand-shake"] == 0 && req.headers["key"] != null){
        try{ 
            SYMMETRIC_KEY = RSA_private_key.decrypt(req.headers["key"], 'utf8')// decrypt SYMMETRIC_KEY
            console.log("Got Client's SYMMETRIC_KEY!")
            return res.status(200).json({status:1, message: "Got SYMMETRIC_KEY! Set header: 'hand-shake' = 1 for future requests"}) 
        }        
        catch(err){
            console.log("Failed to get Client's SYMMETRIC_KEY!")
            return res.status(400).json({status:-1, message: "Couldnt decrypt client's SYMMETRIC_KEY with server's public key, 1) client may not have encrypted SYMMETRIC_KEY with server's public key. 2) no TLS has been made. Two options: 1) key = base64(public_key_encypt(SYMMETRIC_KEY)), hand-shake = 1. 2) hand-shake = 0  to reinitiate TLS handshake. Error: "+err}) 
        }
    }
    else if (req.headers["hand-shake"] === 0 && req.headers["key"] == null){
        return res.status(400).json({status:-1, message: "Client-Server handshake ongoing - Client didn't send encryption key or didnt set 'hand-shake' header to 1 after sending SYMMETRIC_KEY"}) 
    }
}


exports.decryptBody = async (req,res,next) =>                                                                       
{
    let err_obj = null
    let field_array = []
    let error_array = []
    for (let field in req.body){
        try{
            req.body[field] = RSA_private_key.decrypt(req.body[field], 'utf8')  
        }
        catch(err){
            field_array.push(field)
            error_array.push(err)
        }
    }
    if (field_array.length != 0){
        err_obj = {
            message: `ERROR: Couldn't decrypt request body field(s): '${field_array}'! Maybe bad SYMMETRIC_KEY? \n\t\tSError(s): ${error_array}`, 
            err_output_location: "DecryptBody Middleware"
        }
        console.log("Printing from decryptBody Middleware: "+err_obj.message+" \n\t\terr_output_location: "+err_obj.err_output_location)
        return res.status(400).json({status:-1, message: err_obj}) 
    }
    next()
}

exports.decryptSelectedHeader = async (req,res,next) =>                                                                       
{
    let err_obj = null
    encrypted_headers.forEach(field=> {
        if (req.headers[field] == null){                                // if there is no encrypted header to decrypt, move on
            // return res.status(400).json({status:-1, message: "Might be missing header"+field}) 
            return
        }
        try{
            req.headers[field] = RSA_private_key.decrypt(req.headers[field], 'utf8')  
        }
        catch(err){
            err_obj = {
                message: `ERROR: Couldn't decrypt request header field: '${field}'! Maybe bad SYMMETRIC_KEY? \n\t\tError: ${err}`, 
                err_output_location: "DecryptBody Middleware"
            }
            console.log(err_obj.message+" \n\t\terr_output_location: "+err_obj.err_output_location)
            // return res.status(400).json({status:-1, message: err_obj}) 
        }
    })
    next()
}

exports.SYMMETRIC_KEY_encrypt = (data) =>{
    const encrypted_data = CryptoJS.AES.encrypt(data, SYMMETRIC_KEY).toString(); 
    return encrypted_data
}


exports.public_key = public_key;
exports.private_key = private_key;
exports.RSA_private_key = RSA_private_key;
exports.SYMMETRIC_KEY = SYMMETRIC_KEY;

















// const CryptoJS = require("crypto-js");
// const decryption_key = process.env.CLIENT_ENCRYPTION_KEY
// const selected_headers = [
//     // "auth-app", 
//     // "auth-token"
// ]
// exports.decryptBody = async (req,res,next) =>                                                                       
// {
//     let bytes = "";
//     let err_obj = null
//     for (let field in req.body){
//         try{
//             bytes = CryptoJS.AES.decrypt(req.body[field], decryption_key)
//             req.body[field] = bytes.toString(CryptoJS.enc.Utf8)
//         }
//         catch(err){
//             err_obj = {
//                 message: `ERROR: Couldn't decrypt request body field '${field}'!\n\t\tError: ${err}`, 
//                 err_output_location: "DecryptBody Middleware"
//             }
//             console.log("Printing from decryptBody Middleware: "+err_obj.message+" \n\t\terr_output_location: "+err_obj.err_output_location)
//             return res.status(400).json({status:-1, message: err_obj}) 
//         }
//     }
//     next()
// }

// exports.decryptSelectedHeader = async (req,res,next) =>                                                                       
// {
//     let bytes = "";
//     let err_obj = null
//     selected_headers.forEach(field=> {
//         if (req.headers[field] == null){
//             return res.status(400).json({status:-1, message: "Might be missing header"+field}) 
//         }
//         try{
//             bytes = CryptoJS.AES.decrypt(req.headers[field], decryption_key)
//             req.headers[field] = bytes.toString(CryptoJS.enc.Utf8)
//         }
//         catch(err){
//             err_obj = {
//                 message: `ERROR: Couldn't decrypt request header field: '${field}' !\n\t\tError: ${err}`, 
//                 err_output_location: "DecryptBody Middleware"
//             }
//             console.log("Printing from decryptSelectedHeader Middleware: "+err_obj.message+" \n\t\terr_output_location: "+err_obj.err_output_location)
//             return res.status(400).json({status:-1, message: err_obj}) 
//         }
//     })
//     next()
// }