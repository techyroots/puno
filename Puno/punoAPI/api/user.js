"use strict";
require('dotenv').config()
const db = require('./db');
const otp_fun = require('./otp');
const sha256 = require('sha256');
const hdWallet = require('tron-wallet-hd');
const TronWeb = require('tronweb');
const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider("https://api.shasta.trongrid.io");
const solidityNode = new HttpProvider("https://api.shasta.trongrid.io");
const eventServer = new HttpProvider("https://api.shasta.trongrid.io");
const tronGrid = new TronWeb(fullNode, solidityNode, eventServer, process.env.PrivateKey);

const token_address = "TMGm2hq9DvtGkR1KW2c9bTkrk3WAHod39N";
const contractaddress  = "TSq4hAUh13L8tWL7zZRF5rj9geyniKioBg";

exports.email_otp = async (req, res) => {
    try {
        let email = req.body.email;
        if(email != '' && email != null){
            let email_check = await db.query("SELECT * FROM users WHERE email = "+db.pool.escape(email));
            if(!email_check.length){
                let data = {email: email};
                let otp_result = await otp_fun.otp_gen(data);
		//console.log(otp_result);
                res.status(200).send(otp_result);
            }else{
                res.status(200).send({ success: false, msg: 'Email is already registered', data: {}, errors: ''});
            }
        }else{
            res.status(200).send({ success: false, msg: 'Please enter a valid email', data: {}, errors: ''});
        }
    } catch (err) {
        console.log('in email_otp function error');
        console.log(err);
        res.status(500).send({ success: false, msg: 'Error', data: {}, errors: err});
    }
};

exports.signup = async (req, res) =>{    
    try 
    {
	let status;
        let referral_id, referral_bonus;
        let username = req.body.username;
        let email = req.body.email;
        let password = req.body.password;
        let re_password = req.body.re_password;
        let referral = req.body.referral_id;
        let email_otp = req.body.otp;
	console.log("ref",referral);
        if(username != null || username != undefined || username != '' && email != null || email != undefined || email != ''){
            if(password == re_password)
            {
                let username_check = await db.query("SELECT * FROM users WHERE username = "+db.pool.escape(username));
                if(!username_check.length)
                {
                    let email_check = await db.query("SELECT * FROM users WHERE email = "+db.pool.escape(email));
                    if(!email_check.length)
                    {
			if (email_otp != '' && email_otp != null && email_otp != undefined) {
                           console.log("inside");
                     	   let check_refferal_pause = await db.query(`SELECT * FROM referral`);
                          // console.log("check",check_refferal_pause[0].ref_pause)
                           if(check_refferal_pause.length){
                           if(check_refferal_pause[0].ref_pause == "false"){
                           	console.log("1");
                            	if(referral != '' && referral != null && referral != undefined){
                                	 console.log("in")
                               		 referral_id = referral;
                               		 referral_bonus = 1;
                                	 let check_referral = await db.query(`SELECT * from users WHERE id = ${referral}`);
                                	 console.log("check",check_referral)
                                	 if(check_referral.length){
                                    		 console.log("2",check_referral[0].referral_bonus + 1);
                                    		let update_bonus = await db.query(`UPDATE users SET referral_bonus = ${check_referral[0].referral_bonus + 1} WHERE id= ${referral}`); 
                                	 }
                           	}else{
                                	referral_id = 0;
                               		referral_bonus = 0;
                           	 }
                       	    }else{
                           	  console.log("3");
                           	 referral_id = 0;
                           	 referral_bonus = 0;
                       	    }
			    }else{
				referral_id = 0;
                                referral_bonus = 0;
			    }
		            let email_data = { email: email, otp: email_otp, name: username };
                            let email_otp_result = await otp_fun.otp_verify(email_data);
                            if (email_otp_result['success']) {
                            	status = 1;
                            } else {
                            	email_data = { name: email, email: email, msg: "Please Verify Your Email Id For successful Registration.", type: "Signup Verification" };
                            	email_otp_result = await otp_fun.otp_gen(email_data);
                            	if (email_otp_result['success']) {
                                	res.status(200).send({ success: false, msg: "Error in verifying OTP, New OTP are send to you !", data: {}, errors: "" });
                                	return;
                           	} else {
                                	res.status(200).send({ success: false, msg: "Error in verifying otp,Please Submit the form again without otp to generate OTP again", data: {}, errors: "" });
                                	return;
                           	 }
                            }
			    if(status == 1){
                            	let countusers = await db.query("SELECT count(*) AS count from users");
                                let utils=hdWallet.utils;
                                let seed = process.env.mnenomic;
                                let account = await utils.getAccountAtIndex(seed,countusers[0].count);
                                let acc_detail = (Object.values(account));
                                let hash = sha256(password);
                                let sql = await db.query(`INSERT INTO users( username, email, password, referral_id, referral_bonus, wallet_address, private_key) VALUES ( '${username}','${email}', '${hash}', ${referral_id}, ${referral_bonus}, '${acc_detail[1]}', '${acc_detail[0]}')`);
                       	        if (sql) {
                           	   res.status(200).send({ success: true, msg: "Successfully registered", errors: "", registered: true });
                                } else {
                            	   res.status(200).send({ success: false, msg: "Error in registering User", data: {}, errors: "" });
                       	        }
			   }
			}else{
				 console.log("else otp");
               			 let email_data = { name: email, email: email, msg: "Please Verify Your Email Id For successful Registration.", type: "Signup Verification" };
                		 let email_otp_result = await otp_fun.otp_gen(email_data);
               			 if (email_otp_result['success']) {
                    			res.status(200).send({ success: true, msg: "OTP are sent to your mail  for verification", data: {}, errors: "", registered: false });
                   			 return;
               			 } else {
                   			 res.status(200).send({ success: false, msg: "error in sending otp to your email ", data: {}, errors: "" });
                    			 return;
              			 }               
                        }
                    }else {
                        res.status(200).send({ success: false, msg: "Email is already registered!", data: {}, errors: "" });
                        return;
                    }
                }else{
                    res.status(200).send({ success: false, msg: 'Username Already Taken!', data: {}, errors: ''});
                }
            }else 
            {
                res.status(200).send({ success: false, msg: 'Password Mismatch!', data: {}, errors: '' });
            }
        }else{
            res.status(200).send({ success: false, msg: 'Fields are missing!', data: {}, errors: '' });
        }
    } 
    catch (err) {
        console.log('in signup function error');
        console.log(err);
        res.status(500).send({ success: false, msg: 'Error', data: {}, errors: err });
    }
};

exports.login = async (req, res) => {
    try {
        let email = req.body.email;
        let password = req.body.password;
        let user = await db.query("SELECT * FROM users WHERE email = "+db.pool.escape(email));
        if(user.length)
        {
            let hash = user[0].password;
            if(sha256(password) == hash )
            {
                let user_obj = { user_id: user[0].id, email: email }
                // console.log(user)
                res.status(200).json({ success: true, msg: 'Successfully logged In!',  user:user, errors: ''})
            }
            else{
                res.status(200).send({ success: false, msg: 'Invalid password', data: {}, errors: ''});
            }
        }else{
            res.status(200).send({ success: false, msg: 'Email not found', data: {}, errors: ''});
        }
    } catch (err) {
        console.log('in login function error');
        console.log(err);
        res.status(500).send({ success: false, msg: 'Error', data: {}, errors: err});
    }
};

exports.updateProfile = async (req, res) => {
    try {
        let currentpassword = req.body.current_password;
        let currenthash = sha256(currentpassword);
        let newpassword = req.body.new_password;
        let confirmnewpassword = req.body.confirm_new_password;
        let userID = req.body.userId;
        let id_check =  await db.query("SELECT * FROM users WHERE id = "+userID);
        if(id_check.length){
            if(id_check[0].password == currenthash){
                if(newpassword == confirmnewpassword){
                    let hash = sha256(newpassword);
                    let sql = await db.query(`UPDATE users SET password = '${hash}' WHERE id = ${userID}`);
                    if(sql){
                        res.status(200).send({ success: true, msg: 'Profile Successfully Updated', data: {}, errors: ''});
                    }else{
                        res.status(200).send({ success: false, msg: 'Error In Profile Updated', data: {}, errors: ''});
                    }
                }else{
                    res.status(200).send({ success: false, msg: 'Password Mismatch!', data: {}, errors: ''});
                }
            }else{res.status(200).send({ success: false, msg: 'Current password is wrong', data: {}, errors: ''});}
        }else{
            res.status(200).send({ success: false, msg: 'User does not exist.', data: {}, errors: ''});
        }
    } catch (err) {
        console.log('in login function error');
        console.log(err);
        res.status(500).send({ success: false, msg: 'Error', data: {}, errors: err});
    }
};

exports.forget_password_get_otp = async (req, res) => {
    try {
        let email = req.body.email;
        let user = await db.query("SELECT * FROM `users` WHERE `email` LIKE "+db.pool.escape(email)+";");
        if(user.length){
            let tx_id = user[0].id+""+Math.floor(Date.now() / 1000);
            let data = {user_id: user[0].id, email: email, tx_id: tx_id, msg: 'Forget Password'};
            let otp_result = await otp_fun.otp_gen(data);
            if(otp_result['success']){
                res.status(200).send({ success: true, msg:'An OTP sent to your email.', data: {tx_id: tx_id}, errors: ''});
            }else{
                res.status(200).send(otp_result);
            }
        }else{
            res.status(200).send({ success: false, msg: 'No match found', data: {}, errors: ''});
        }
    } catch (err) {
        console.log('in forget_password_get_otp function error');
        console.log(err);
        res.status(500).send({ success: false, msg: 'Error', data: {}, errors: err});
    }
};

exports.forget_password_verify_otp = async (req, res) => {
   // try {
        let email = req.body.email;
        console.log(email)
        let password = req.body.password;
        let re_password = req.body.re_password;
        let otp = req.body.otp;
	console.log("inside");
        if(password == re_password){
                console.log("s");
                let password_hash = sha256(password);
                console.log(password_hash);
                let user = await db.query("SELECT * FROM `users` WHERE `email` LIKE "+db.pool.escape(email)+";");
                 console.log("1",user);
                let otp_details= await db.query("SELECT * FROM `otp` WHERE otp LIKE "+otp+" OR user_id LIKE "+user[0].id+";");
                let tx_id = otp_details[0].tx_id;
                console.log("2",tx_id);
                if(user.length){
                    let email = user[0].email;
                    let data = {email: email, otp: otp, tx_id: tx_id, user_id: user[0].id};
                    let otp_result = await otp_fun.otp_verify(data);
                    console.log("otp",otp_result);
                    if(otp_result['success'])
                    {                
                        let user = await db.query("UPDATE `users` SET `password` = '"+ password_hash +"' WHERE `users`.`email` = "+db.pool.escape(email)+";");
                        if(user.affectedRows == 1){
                            res.status(200).send({ success: true, msg: 'Password successfully changed.', data: {}, errors: ''});
                        }else{
                            res.status(200).send({ success: false, msg: 'Error', data: {}, errors: ''});
                        }
                    }
                    else{
                        res.status(200).send(otp_result);
                    }
                }
                else{
                    res.status(200).send({ success: false, msg: 'No user found', data: {}, errors: ''});
                }
        }
        else{
            res.status(200).send({success:false,msg:'Password not match'});
        }
   // } catch (err) {
     //   console.log('in forget_password_verify_otp function error');
       // console.log(err);
      //  res.status(500).send({ success: false, msg: 'Error', data: {}, errors: err});
    //}
};

exports.invest = async (req, res) => {
    let token_amount;
    let user_id = req.body.user_id;
    let amount = req.body.amount;
    let user_details = await db.query("SELECT * FROM users WHERE id = " + user_id);
    if(user_details.length){
        let check_refferal_pause = await db.query(`SELECT * FROM referral`);
        // console.log(check_refferal_pause)
        let trongrid = new TronWeb(fullNode, solidityNode, eventServer, user_details[0].private_key);
        let bal = await trongrid.trx.getBalance(user_details[0].wallet_address);
        let instance = await trongrid.contract().at(contractaddress);
        if(bal != 0 && bal > amount *10**6){
            let invest = await instance.invest().send({ callValue: amount* 10 **6});
            // console.log(invest)
            let events = await trongrid.getEventResult(contractaddress,{eventName:"Invested", size:1})
            console.log(events)
            if(events){
                let transaction = await trongrid.trx.getUnconfirmedTransactionInfo(events[0].transaction);
                if(transaction.receipt.result == "SUCCESS"){
                    if(check_refferal_pause[0].ref_pause == "false"){
                        if(user_details[0].referral_id != 0){
                            let referral_details = await db.query("SELECT * FROM users WHERE id = " + user_details[0].referral_id);
                            if(referral_details.length){
                                let referral_per = referral_details[0].referral_bonus + (events[0].result.tokenAmount/10 ** 6) * (10 /100);

				console.log(referral_per)
                                token_amount = ((events[0].result.tokenAmount)/10 ** 6) - (events[0].result.tokenAmount/10 ** 6) * (10 /100);
                                console.log(token_amount);
                                await db.query(`UPDATE users SET referral_bonus = ${referral_per} WHERE id = ${user_details[0].referral_id}`);
                            }
                            else{
                                token_amount = events[0].result.tokenAmount/10 ** 6;
                            }
                        }else{
                            token_amount = events[0].result.tokenAmount/10 ** 6;
                        }
                    }else{
                       token_amount = events[0].result.tokenAmount/10 ** 6; 
                    }
                    let sql = await db.query(`INSERT INTO transactions (user_id, wallet_address, type, tron_amount, token_amount) VALUES (${user_id}, '${user_details[0].wallet_address}', 'Invest', ${amount}, ${token_amount})`);
                    if(sql){
                        res.status(200).send({ success: true, msg: 'Invested Successfully ', data: {}, errors: ''});
                    }
                    else{
                        res.status(200).send({ success: false, msg: 'Error', data: {}, errors: ''});
                    }
                }
                else{
                    res.status(200).send({ success: false, msg: 'Transaction not confirm', data: {}, errors: ''});
                }
            }else{
                res.status(200).send({ success: false, msg: 'Error in invest', data: {}, errors: ''});
            }
        }else{
            res.status(200).send({ success: false, msg: 'Not enough balance in your wallet ', data: {}, errors: ''});
        }
    }else{
        res.status(200).send({ success: false, msg: 'User does not exist.', data: {}, errors: ''});
    }
}

exports.withdrawal = async (req, res) => {
    let user_id = req.body.user_id;
    let amount = req.body.amount;
    let type   = req.body.type;
    let wallet_address = req.body.wallet_address;
    let user_details = await db.query("SELECT * from users WHERE id =" + user_id);
    if(user_details.length){
        let trongrid = new TronWeb(fullNode, solidityNode, eventServer, user_details[0].private_key);
        let instance = await trongrid.contract().at(contractaddress);
        if(type == 'puno' && wallet_address == null){
            let withdrawal = await instance.withdrawal(amount * 10**6).send();
            // console.log(withdrawal)
            let events = await trongrid.getEventResult(contractaddress,{eventName:"Withdraw", size:1})
            console.log(events);
            if(events != ''){
                let transaction = await trongrid.trx.getUnconfirmedTransactionInfo(events[0].transaction);
                if(transaction.receipt.result == "SUCCESS"){
                    let sql = await db.query(`INSERT INTO transactions (user_id, wallet_address, type, tron_amount, token_amount) VALUES (${user_id}, '${user_details[0].wallet_address}', 'Withdraw Puno', 0 , ${amount})`);
                    if(sql){
                        res.status(200).send({ success: true, msg: 'Withdraw Successfully ', data: {}, errors: ''});
                    }
                    else{
                        res.status(200).send({ success: false, msg: 'Error', data: {}, errors: ''});
                    }
                }
            }else{
                res.status(200).send({ success: false, msg: 'Error in withdraw', data: {}, errors: ''});
            }
        }else if(type == 'tron' && wallet_address != null){
           let bal = await trongrid.trx.getBalance(user_details[0].wallet_address);
           if(bal != 0 && bal > amount *10**6){
               let send_transaction = await trongrid.trx.sendTransaction(wallet_address, amount*10 **6);
               console.log(send_transaction.result);
               if(send_transaction.result == true){
                   await db.query(`INSERT INTO transactions (user_id, wallet_address, type, tron_amount, token_amount) VALUES (${user_id}, '${user_details[0].wallet_address}', 'Withdraw TRX', ${amount}, 0)`);
                   res.status(200).send({ success: true, msg: 'Transfer tron to your wallet ', data: {}, errors: ''});
               }else{
                    res.status(200).send({ success: false, msg: 'Transaction not confirm', data: {}, errors: ''});
               }
            }else{
                res.status(200).send({ success: false, msg: 'Not enough balance in your wallet ', data: {}, errors: ''});
            }
        }else if(type == 'referral' && wallet_address != null){
            if(user_details[0].referral_bonus > 0 && user_details[0].referral_bonus > amount){
                let send_transaction = await tronGrid.trx.sendTransaction(wallet_address, amount*10 **6);
                console.log(send_transaction.result);
                if(send_transaction.result == true){
                   await db.query(`UPDATE users SET referral_bonus = ${user_details[0].referral_bonus - amount}  WHERE id = ${user_id}`)
                   await db.query(`INSERT INTO transactions (user_id, wallet_address, type, tron_amount, token_amount) VALUES (${user_id}, '${user_details[0].wallet_address}', 'Withdraw Refereal Bonus', 0, ${amount})`);
                   res.status(200).send({ success: true, msg: 'Transfer Puno to your wallet ', data: {}, errors: ''});
                }else{
                    res.status(200).send({ success: false, msg: 'Transaction not confirm', data: {}, errors: ''});
                }
            }else{
                res.status(200).send({ success: false, msg: 'Not Enough Referral Bonus ', data: {}, errors: ''});
            }
        }
    }else{
        res.status(200).send({ success: false, msg: 'User does not exist.', data: {}, errors: ''});
    }
}

exports.fetchDetails = async (req, res) => {
    let where;
    let data = req.query.data;
    let filter = req.query.filter;
    let item   = req.query.item;
    if(item != '' && data != ''){
        where = `${item} = '${data}' `;
    }
    else{
        where = '';
    }
    if(where == ''){
        let info  = await db.query(`SELECT * FROM ${filter}`);
        res.status(200).send({success:true,msg:'Fetched Data', data:info,  error:''});
    }else{
        let info  = await db.query(`SELECT * FROM ${filter} WHERE ${where}`);
        res.status(200).send({success:true,msg:'Fetched Data', data:info, error:''});
    }
};

exports.transactionDetails = async (req, res) => {
    let wallet_address = req.body.wallet_address;
    let type   = req.body.type;
    let amount = req.body.tron_amount;
    let token_amount = req.body.token_amount;
    if(wallet_address != '' && type != '' && amount != ''){
        let sql = await db.query(`INSERT INTO transactions (wallet_address, type, tron_amount, token_amount) VALUES ('${wallet_address}', '${type}', ${amount}, ${token_amount})`);
        if(sql){
            res.status(200).send({success:true,msg:'Save Transaction Details',  error:''});
        }
        else{
            res.status(200).send({success:false,msg:'Error', data:{}, error:''});
        }
    }else{
        res.status(200).send({success:false,msg:'Empty Fields', data:{}, error:''});
    }
}

exports.downline = async (req, res) => {
    let wallet_address = req.query.wallet_address;
    let temp  = await db.query(`SELECT * FROM users WHERE wallet_address = '${wallet_address}'`)
    if(temp.length){
        let result = await db.query("select *  from users where referral_id = " + temp[0].id);
        console.log("result",result);
        if(result.length != 0){
            res.status(200).send({ success: true, msg: 'Downline..', data: result, data1: temp , errors: '' });
        }else{
            res.status(200).send({ success: false, msg: 'Downline..', errors:''});
        }
    }
}

exports.Alldownline = async (req, res) => {
    let temp  = await db.query(`SELECT * FROM users WHERE referral_id != 0 ORDER BY referral_id`);
    console.log(temp.length);
    let resultArray = [];
    if(temp.length){
        for (let i = 0; i < temp.length; i++) {
           let result = await db.query("select *  from users where id = " + temp[i].referral_id);
            resultArray.push(result);  
        }
        if(resultArray.length != 0){
            res.status(200).send({ success: true, msg: 'Downline..', data: resultArray, data1: temp , errors: '' });
        }else{
            res.status(200).send({ success: false, msg: 'Downline..', data1:temp , errors: '' });
        }
    }else{
        res.status(200).send({ success: false, msg: 'No referral found',errors: '' });
    }
}

exports.show_user = async (req,res) => {
    let user_id = req.query.user_id;
    let sql = await db.query(`SELECT * FROM users WHERE id = ${user_id}`);
    if(sql.length){
        let trongrid = new TronWeb(fullNode, solidityNode, eventServer, sql[0].private_key);
        let instance = await trongrid.contract().at(token_address);
        let puno_bal = await instance.methods.balanceOf(sql[0].wallet_address).call();
        console.log(trongrid.toDecimal(puno_bal._hex))
        let bal = await trongrid.trx.getBalance(sql[0].wallet_address);
        res.status(200).send({ success: true, msg: 'User exist.', data: sql, bal : bal/10**6, punobal: (trongrid.toDecimal(puno_bal._hex))/10**6, errors: ''});
    }else{
        res.status(200).send({ success: false, msg: 'User does not exist.', data: {}, errors: ''});
    }
}

exports.coinbal = async (req, res) => {
    let wallet_address = req.query.wallet_address;
    let sql = `SELECT sum(token_amount) AS sum  FROM transactions WHERE wallet_address = '${wallet_address}' and type ='Invest'`;
    let coin = await db.query(sql);
    if(coin){
    	 res.status(200).send({ success: true, msg: 'User exist.', data: coin, errors: ''});
    }else{
         res.status(200).send({ success: false, msg: 'User does not exist.', data: {}, errors: ''});
    }
     
}


exports.chnggFunction = async (req,res) => {
    let amount = req.body.amount;
    let type   = req.body.type;
    let instance = await tronGrid.contract().at(contractaddress);
    let tokenprice = await instance.methods.price().call();
    let price = tronGrid.toDecimal(tokenprice._hex);
    if(type == 'TRX'){
        let tokens = ((amount * 10 ** 12)/price);
        res.status(200).send({ success: true, msg: 'Success', tron: amount , token: tokens/10**6, errors: ''});
    }else{
        let amt = amount * price;
        res.status(200).send({ success: true, msg: 'Success', tron: amt/10**6 , token: amount, errors: ''});
    }
}

exports.investDetails = async (req,res) => {
    let result = [];
    let userId = req.body.userId;
    let instance = await tronGrid.contract().at(contractaddress);
    let user_details = await db.query(`SELECT * FROM users WHERE id = ${userId}`);
    if(user_details.length){
        let getdetails = await instance.methods.getUserDetails(user_details[0].wallet_address).call();
        console.log(getdetails);
        let invest_length = tronGrid.toDecimal((getdetails[1]._hex));
        console.log("len",invest_length)
        if(invest_length != 0){
            let getLockTime = await instance.methods.getLockTime().call();
            let get_lock_stamp = (tronGrid.toDecimal((getLockTime._hex)))*1000;
            let check_refferal_pause = await db.query(`SELECT * FROM referral`);
            console.log(check_refferal_pause[0].ref_pause);
            for(var i = 1; i <= invest_length; i++){
                let getInvestDetails = await instance.methods.getInvestDetails(user_details[0].wallet_address, i).call();
                let puno_tokens = tronGrid.toDecimal(getInvestDetails[0]._hex);
                let invest_trx  = tronGrid.toDecimal(getInvestDetails[1]._hex);
                let buy_stamp = tronGrid.toDecimal((getInvestDetails[2]._hex))*1000;
                let unlock_stamp  = buy_stamp + get_lock_stamp;
                let invest = [puno_tokens, invest_trx, buy_stamp, unlock_stamp];
                result.push(invest);
            }
            console.log("x",result)
            if(result){
                 res.status(200).send({ success: true, msg: 'Invested Details', data: result, refPause:check_refferal_pause[0].ref_pause, referralid:user_details[0].referral_id, errors: ''}); 
            }
        }else{
            res.status(200).send({ success: true, msg: 'No invested yet', data: {}, errors: ''}); 
        }
    }else{
       res.status(200).send({ success: false, msg: 'User does not exist.', data: {}, errors: ''});
    }
}


// Admin APIs

exports.setReferral = async (req,res) => {
    let referral_pause;
    let pause_check  = await db.query(`SELECT * FROM referral`);
    if(pause_check.length){
        console.log(pause_check[0].ref_pause)
        if(pause_check[0].ref_pause == 'true'){
            referral_pause = 'false';
            let sql = await db.query(`UPDATE referral SET ref_pause = '${referral_pause}'`);
            if(sql.affectedRows == 1){
                res.status(200).send({ success: true, msg: 'Unpaused the referral', data: 'unpaused', errors: ''});
            }else{
                res.status(200).send({ success: false, msg: 'Error while paused the referral', errors: ''});
            }
        }
        else if(pause_check[0].ref_pause == 'false'){
            referral_pause = 'true';
            let sql = await db.query(`UPDATE referral SET ref_pause = '${referral_pause}'`);
            if(sql.affectedRows == 1){
                res.status(200).send({ success: true, msg: 'Paused the referral',data: 'paused', errors: ''});
            }else{
                res.status(200).send({ success: false, msg: 'Error while paused the referral', errors: ''});
            }
        }
    }else{
      res.status(200).send({ success: false, msg: 'Error while paused the referral', errors: ''});
    }
}

exports.changePrice = async (req, res) => {
    let amount   = req.query.price; 
    let instance = await tronGrid.contract().at(contractaddress);
    let setPrice = await instance.setRate(tronGrid.toSun(amount)).send();
    let events = await tronGrid.getEventResult(contractaddress,{eventName:"RateChanged", size:1});
    console.log(events);
    if(events){
        let transaction = await tronGrid.trx.getUnconfirmedTransactionInfo(events[0].transaction);
        if(transaction.receipt.result == "SUCCESS"){
            res.status(200).send({ success: true, msg: 'Successfully changed the token price ', data: {}, errors: ''});
        }else{
            res.status(200).send({ success: false, msg: 'Transaction Error', data: {}, errors: ''});
        }
    }
    else{
         res.status(200).send({ success: true, msg: 'Error while changed the token price', data: {}, errors: ''});
    }
}

exports.pause = async(req, res) =>{
    let instance = await tronGrid.contract().at(contractaddress);
    let pause = await instance.pause().send();
    let events = await tronGrid.getEventResult(contractaddress,{eventName:"Paused", size:1});
    console.log(events);
    if(events){
        let transaction = await tronGrid.trx.getUnconfirmedTransactionInfo(events[0].transaction);
        if(transaction.receipt.result == "SUCCESS"){
            res.status(200).send({ success: true, msg: 'Successfully Paused ', data: {}, errors: ''});
        }else{
            res.status(200).send({ success: false, msg: 'Something went wrong', data: {}, errors: ''});
        }
    }
    else{
         res.status(200).send({ success: true, msg: 'Error while Pause', data: {}, errors: ''});
    }
}

exports.unpause = async(req, res) =>{
    let instance = await tronGrid.contract().at(contractaddress);
    let unpause = await instance.unpause().send();
    let events = await tronGrid.getEventResult(contractaddress,{eventName:"Unpaused", size:1});
    console.log(events);
    if(events){
        let transaction = await tronGrid.trx.getUnconfirmedTransactionInfo(events[0].transaction);
        if(transaction.receipt.result == "SUCCESS"){
            res.status(200).send({ success: true, msg: 'Successfully unpaused ', data: {}, errors: ''});
        }else{
            res.status(200).send({ success: false, msg: 'Something went wrong', data: {}, errors: ''});
        }
    }
    else{
         res.status(200).send({ success: true, msg: 'Error while Unpause', data: {}, errors: ''});
    }
}

exports.lockTime = async (req, res) => {
    let locktime   = req.query.locktime; 
    let instance = await tronGrid.contract().at(contractaddress);
    let setPrice = await instance.setLockTime(locktime).send();
    let events = await tronGrid.getEventResult(contractaddress,{eventName:"LockTimeChanged", size:1});
    console.log(events);
    if(events){
        let transaction = await tronGrid.trx.getUnconfirmedTransactionInfo(events[0].transaction);
        if(transaction.receipt.result == "SUCCESS"){
            res.status(200).send({ success: true, msg: 'Successfully changed the lock time ', data: {}, errors: ''});
        }else{
            res.status(200).send({ success: false, msg: 'Something went wrong', data: {}, errors: ''});
        }
    }
    else{
         res.status(200).send({ success: true, msg: 'Error while changing  the lock time', data: {}, errors: ''});
    }
}

exports.startsAt = async (req, res) => {
    let startTime   = req.query.startTime; 
    let instance = await tronGrid.contract().at(contractaddress);
    let setPrice = await instance.setStartsAt(startTime).send();
    let events = await tronGrid.getEventResult(contractaddress,{eventName:"StartsAtChanged", size:1});
    console.log(events);
    if(events){
        let transaction = await tronGrid.trx.getUnconfirmedTransactionInfo(events[0].transaction);
        if(transaction.receipt.result == "SUCCESS"){
            res.status(200).send({ success: true, msg: 'Successfully changed the start time', data: {}, errors: ''});
        }else{
            res.status(200).send({ success: false, msg: 'Something went wrong', data: {}, errors: ''});
        }
    }
    else{
         res.status(200).send({ success: true, msg: 'Error while changing  the start time', data: {}, errors: ''});
    }
}

exports.endsAt = async (req, res) => {
    let endtime   = req.query.endtime; 
    let instance = await tronGrid.contract().at(contractaddress);
    let setPrice = await instance.setEndsAt(endtime).send();
    let events = await tronGrid.getEventResult(contractaddress,{eventName:"EndsAtChanged", size:1});
    console.log(events);
    if(events){
        let transaction = await tronGrid.trx.getUnconfirmedTransactionInfo(events[0].transaction);
        if(transaction.receipt.result == "SUCCESS"){
            res.status(200).send({ success: true, msg: 'Successfully changed the end time', data: {}, errors: ''});
        }else{
            res.status(200).send({ success: false, msg: 'Something went wrong', data: {}, errors: ''});
        }
    }
    else{
         res.status(200).send({ success: true, msg: 'Error while changing  the end time', data: {}, errors: ''});
    }
}

exports.transferTokens = async (req, res) => {
    let transferToken   = req.query.transferToken; 
    let instance = await tronGrid.contract().at(contractaddress);
    let setPrice = await instance.transferTokens(tronGrid.toSun(transferToken)).send();
    console.log(setPrice)
    let events = await tronGrid.getEventResult(token_address,{eventName:"Transfer", size:1});
    if(events){
        let transaction = await tronGrid.trx.getUnconfirmedTransactionInfo(events[0].transaction);
        console.log(transaction)
        if(transaction.receipt.result == "SUCCESS"){
            res.status(200).send({ success: true, msg: 'Successfully transfer the tokens', data: {}, errors: ''});
        }else{
            res.status(200).send({ success: false, msg: 'Something went wrong', data: {}, errors: ''});
        }
    }
    else{
         res.status(200).send({ success: true, msg: 'Error while transfer the tokens', data: {}, errors: ''});
    }
}

exports.getPause = async (req,res) => {
    let instance = await tronGrid.contract().at(contractaddress);
    let paused = await instance.methods.paused().call();
    console.log(paused);
    res.status(200).send({ success: true, msg: 'Pause Details', data: paused, errors: ''});
}

exports.allTransactions = async (req,res) => {
    let sql = await db.query(`SELECT * FROM transactions`);
    if(sql.length){
        let instance = await tronGrid.contract().at(contractaddress);
        let getLockTime = await instance.methods.getLockTime().call();
        let get_lock_stamp = (tronGrid.toDecimal((getLockTime._hex)))*1000;
        res.status(200).send({ success: true, msg: 'Fetch Transaction History', data: sql, lockTime: get_lock_stamp, errors: ''});
    }else{
        res.status(200).send({ success: false, msg: 'No Transaction History', data: {}, errors: ''}); 
    }
}


