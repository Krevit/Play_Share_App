# Social_Media_REST_API
*Example Client requests that can be made to this REST API are shown in Example_Client_Requests.js*

----------------------

* **This REST API is built using Node, Express, and Mongoose** 
* **bcrypt is used to store hashed passwords and hashed user JWT secret keys into the database**
* **JWT is used to authenticate a user**
* **Joi is used to validate POST requests**
* **crypto-js is used to encrpt and decrypt a user's password**

----------------------

# 🏡 HOW TO RUN SERVER LOCALLY:
1) `npm install`
2) Need to make an **.env** file and create these eight variables. Can make up your own values for all variables except for **DB_CONNECT**: 
   * `DB_CONNECT`  - Store your MongoDB Connection URL
   * `ADMIN_EMAIL` - Register/add your admin account to the database and store the email address here. Can generate JWT token and login to the admin account using this email.
   * `APP_AUTH_KEY` - Need this key to give the client permission to talk to the server. This is to stop unauthorized apps to attack the server with new user registrations and ultimately overload the database..
   * `ADMIN_SECRET_KEY` - This will be used to make the admin's JWT
   * `USER_SECRET_KEY`  - This will be used to make the user's JWT
   * `SERVER_ENCRYPTION_KEY`   - This key will help the client decrypt the JWT token that is sent from the server durign login.
   * `CLIENT_ENCRYPTION_KEY`   - This key will help the server decrypt the password and the JWT token that is sent from the client during registration and login.
   * `SALT_NUM = 10`    - Can keep this as is. This is the salt number to hash the password and the JWT User Secret Key to store in the database. Can chnage this number every year to change future hashed algorithm
3) `npm start`

# 🛡️ APP SECURITY:
### 🔑 REGISTRATION SECURITY
* **Client:** 
  * The password is encrypted with the `SERVER_ENCRYPTION_KEY` and is sent to the REST API Server over http. 
* **Server:** 
  * The password is decrypted using the `SERVER_ENCRYPTION_KEY` and is then hashed using **bcrypt** and stored in the database
  * The request is validated using **Joi**

### 🔒 LOGIN SECURITY
* **Client**
  * The password is encrypted with the `CLIENT_ENCRYPTION_KEY` and is sent to the REST API Server over http. 
* **Server**
  * The password is decrypted using the `CLIENT_ENCRYPTION_KEY`.
  * User is verified by using **bcrypt** to calculate a hash and comparing it to the hashed password that is stored in the database. 
  * **JWT Token Creation Process for Users:**
    * *JSON Web Tokens (JWT)* need a secret key to create a JWT token hash. We need a unique JWT secret key for each user to that an user can't access another user's routes.
    * A unique JWT User Secret Key hash is created by hashing `USER_SECRET_KEY` and salting it using a unique string created by append different fields of the user's profile data that is stored in the database (such as the username, email, hashed password,and ObjectID). 
    * This creates a unique key for each user. This ensures that each user has a unique secret key and therefore a unique JWT
    * We need to store this User Secret Key so that we can validate a JWT. The User JWT User Secret Key is hashed with *bcrypt* and is then stored in database.
    * The JWT is created using the concatenation of all the user's profile data and the User Secret Key.
  * **JWT Token Creation Process for Admin:**
    * The JWT is created using the concatenation of all the user's profile data and the concatenation of the User Secret Key and `ADMIN_SECRET_KEY`
* **Sending JWT Tokens**
  * The JWT token is encrypted with two keys when sending from client and server.
  * In the server, the JWT token is encrypted using the `SERVER_ENCRYPTION_KEY` and is stored in the 'auth-token' header and is sent to the client. When verifying a user, can decrypt the jwt token that the client sent in the header by decrypting it using the `CLIENT_ENCRYPTION_KEY`. 
  * When the client makes a request to access a private route, it needs to decrypted the token stored in the header using the `SERVER_ENCRYPTION_KEY` and send it to the server by encrypting it using the `CLIENT_ENCRYPTION_KEY`. This way, the token is encrypted both ways.

# 📐 Usability:

