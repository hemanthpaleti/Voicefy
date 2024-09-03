const express=require('express')
const app=express()

const dotenv=require('dotenv');
const path=require('path');

const bodyparser=require('body-parser')
app.use(bodyparser.urlencoded({extended: true}))

app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'));

app.use(express.static(path.join(__dirname,'assets')));

const bcrypt = require('bcrypt');

const { initializeApp,cert} = require('firebase-admin/app');
const { getFirestore} = require('firebase-admin/firestore');
var serviceAccount = require("./key.json");
initializeApp({
  credential: cert(serviceAccount),
  ignoreUndefinedProperties: true
});
const db = getFirestore();

app.get('/',(req,res)=>{
    res.render('home');
})

app.get('/signup',(req,res)=>{
    const alertMessage=req.query.alertMessage;
    res.render('studentsignup',{alertMessage})
})

app.post('/signupsubmit',async (req,res)=>{
    try{
    const newUser = {
        username: req.body.name,
        email: req.body.email,
        password: await bcrypt.hash(req.body.password, 10)
    }
    const userRef = db.collection('users');
    const namequery= await userRef.where('username', '==', newUser.username).get();                             
    if(!namequery.empty){
        const alertMessage = 'Username already exists';
        return res.redirect(`/signup?alertMessage=${encodeURIComponent(alertMessage)}`);
    } 
    const emailquery = await userRef.where('email', '==', newUser.email).get();                             
    if(!emailquery.empty){
        const alertMessage = 'EmailId already exists';
        return res.redirect(`/signup?alertMessage=${encodeURIComponent(alertMessage)}`);
    } 
    await userRef.add(newUser);
    const alertMessage = 'User Registered Successfully';
    return res.redirect(`/login?alertMessage=${encodeURIComponent(alertMessage)}`);

    }   
    catch{
        const alertMessage = 'An error occurred during registration. Please try again later.';
        return res.redirect(`/signup?alertMessage=${encodeURIComponent(alertMessage)}`);
    }               
})

app.get('/login',(req,res)=>{
    const alertMessage=req.query.alertMessage;
    res.render('studentlogin',{alertMessage})
})

app.post('/loginsubmit',async (req,res)=>{
    try{
    const info=db.collection('users');
    const snapshot=await info.where('email','==',req.body.email).get();
    if(snapshot.empty){
        const alertMessage='Email not registered please create an acccount';
        return res.redirect(`/signup?alertMessage=${encodeURIComponent(alertMessage)}`);
    }
    else{
        const userdoc=snapshot.docs[0];
        const storedpassword=userdoc.data().password;
        const isPasswordCorrect = await bcrypt.compare(req.body.password,storedpassword);

        if (isPasswordCorrect){
            const alertMessage='Login successfully'
            const email=req.body.email
            return res.redirect(`/studentprb?alertMessage=${encodeURIComponent(alertMessage)}&email=${encodeURIComponent(email)}`);
        }
        else{
            const alertMessage='Password and Email-Id mismatched please verify'
            return res.redirect(`/login?alertMessage=${encodeURIComponent(alertMessage)}`);
        } 
    }
    }
    catch (error) {
        console.error('Error during login:', error);
        const alertMessage = 'An error occurred during login. Please try again later.';
        return res.redirect(`/login?alertMessage=${encodeURIComponent(alertMessage)}`);
    }
})

app.get('/studentprb',(req,res)=>{
    const alertMessage=req.query.alertMessage;
    const email=req.query.email;
    res.render('student problem',{alertMessage,email})
})

app.post('/problemsub', async (req, res) => {
    try {
        const prob = {
            Reg_No: req.body.regno,
            Branch: req.body.branch,
            Year: req.body.year,
            Problem: req.body.problem
        };

        const userEmail = req.body.email;

        const problemsCollectionRef = db.collection('problems'); // Create a sub-collection named 'problems'

        await problemsCollectionRef.add(prob); // Store the problem data in the 'problems' sub-collection

        const alertMessage = 'Problem raised Successfully';
        res.redirect(`/studentprb?alertMessage=${encodeURIComponent(alertMessage)}&email=${encodeURIComponent(userEmail)}`);
    } catch (error) {
        console.error('Error in raising the problem:', error);
        const alertMessage = 'Error in raising the problem';
        return res.redirect(`/studentprb?alertmessage=${encodeURIComponent(alertMessage)}`);
    }
});

app.get('/faclogin',(req,res)=>{
    const alertMessage=req.query.alertMessage;
    res.render('Faculty',{alertMessage})
})

app.post('/facloginsubmit',async (req,res)=>{
    try{
        const info=db.collection('faculty');
        const snapshot = await info.where('Name', '==', req.body.input).get();
        if(snapshot.empty){
            const alertMessage='Email not registered please contact the administrator';
            return res.redirect(`/faclogin?alertMessage=${encodeURIComponent(alertMessage)}`);
        }
        else{
            const userdoc=snapshot.docs[0];
            const storedpassword=userdoc.data().Password;
            const userPassword = req.body.Password
    
            if (storedpassword==userPassword){
                const alertMessage='Login successfully'
                const value=req.body.input
                return res.redirect(`/facultydashboard?alertMessage=${encodeURIComponent(alertMessage)}&value=${encodeURIComponent(value)}`);
            }
            else{
                const alertMessage='Password and Email-Id mismatched please verify'
                return res.redirect(`/faclogin?alertMessage=${encodeURIComponent(alertMessage)}`);
            } 
        }
        }
        catch (error) {
            console.error('Error during login:', error);
            const alertMessage = 'An error occurred during login. Please try again later.';
            return res.redirect(`/faclogin?alertMessage=${encodeURIComponent(alertMessage)}`);
        }
    })

app.get('/facultydashboard',async (req,res)=>{
    const value=req.query.value;
    try{
        const subdocs=db.collection('problems');
        const snap=await subdocs.where('Branch','==',value)
                                .get();
        const docs = [];
        snap.forEach(doc=>{
            const data=doc.data();
            docs.push(data);
        })
        const alertMessage=req.body.alertMessage;
        res.render('Facultyresponse', { docs,value,alertMessage});                   
        }catch{
            const alertMessage = 'An error occurred while fetching transactions.';
            res.redirect(`/dashboard?alertMessage=${encodeURIComponent(alertMessage)}`);
        }                                

})

dotenv.config({path:'config.env'})
const port=process.env.PORT||3000;
app.listen(port, ()=>{
    console.log(`The server is running on: http://localhost:${port}`);
})