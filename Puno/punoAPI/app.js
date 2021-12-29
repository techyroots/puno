"use strict";
const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser  = require("body-parser");
const auth = require('./api/user');
// const admin = require('./api/admin');

app.use(cors());
app.use(express());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.listen(5000);
console.log("RUNING NFT-API...", Date.now());

app.get('/',(req,res)=>{
    res.status(200).send({ success: true, msg: 'Welcome to the Puno.'});
});

app.post('/api/email_otp', [auth.email_otp]);
app.post('/api/signup', [auth.signup]);
app.post('/api/login', [auth.login]);
app.post('/api/forget_password_get_otp', [auth.forget_password_get_otp]);
app.post('/api/forget_password_verify_otp', [auth.forget_password_verify_otp]);
app.post('/api/updateProfile', [auth.updateProfile]);
app.get('/api/coinbal', [auth.coinbal]);
app.post('/api/invest', [auth.invest]);
app.post('/api/withdrawal', [auth.withdrawal]);

app.get('/api/fetchDetails', [auth.fetchDetails]);
app.post('/api/transactionDetails', [auth.transactionDetails]);

app.get('/api/downline', [auth.downline]);
app.get('/api/show_user', [auth.show_user]);
app.get('/api/Alldownline', [auth.Alldownline]);
app.get('/api/setReferral', [auth.setReferral]);
app.post('/api/chnggFunction',[auth.chnggFunction]);

app.post('/api/investDetails', [auth.investDetails]);

app.get('/api/changePrice', [auth.changePrice]);
app.get('/api/pause', [auth.pause]);
app.get('/api/unpause', [auth.unpause]);
app.get('/api/lockTime', [auth.lockTime]);
app.get('/api/startsAt', [auth.startsAt]);
app.get('/api/endsAt', [auth.endsAt]);
app.get('/api/transferTokens', [auth.transferTokens]);
app.get('/api/getPause', [auth.getPause]);
app.get('/api/allTransactions', [auth.allTransactions]);

// The 404 Route (ALWAYS Keep this as the last route)
app.get('*', function(req, res){
  res.status(404).send({ success: false, msg: 'Wrong end point...'});
});

app.post('*', function(req, res){
  res.status(404).send({ success: false, msg: 'Wrong end point...'});
});
