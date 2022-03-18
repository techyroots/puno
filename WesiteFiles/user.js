"use strict";
require('dotenv').config()
const db = require('./db');
const otp_fun = require('./otp');
const emailSend = require('./email');
const sha256 = require('sha256');
const hdWallet = require('tron-wallet-hd');
const TronWeb = require('tronweb');
const { Console } = require('console');
const { existsSync } = require('fs');
const HttpProvider = TronWeb.providers.HttpProvider;
const fullNode = new HttpProvider("https://api.shasta.trongrid.io");
const solidityNode = new HttpProvider("https://api.shasta.trongrid.io");
const eventServer = new HttpProvider("https://api.shasta.trongrid.io");
const tronGrid = new TronWeb(fullNode, solidityNode, eventServer, '4297971ecd3a7f17a1324fe9e9743893aa5c76a8d3ba240672023cd11b9d46ae');
const rewardtronGrid = new TronWeb(fullNode, solidityNode, eventServer, process.env.RewardWallet);
// const token_address = "TEQqUhRW7xKG3PvGMT6Aeqsb5Rj1GbjmwG";
// const contractaddress = "TBv5hg3VdzKQhxVBv9yZXr1Gu34Jr6wAsZ";

const token_address = "TRS4ZjSvY9BErqeurihPYeWNMY4u4A1kff";
const contractaddress = "TAQgpMS8jZKY4mjt3FcDh88L6C5yXiqmGU";

const accountSid = process.env.accountSid;
const authToken = process.env.authToken;

var today = new Date();
var dd = String(today.getDate()).padStart(2, '0');
var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
var yyyy = today.getFullYear();
today = mm + '/' + dd + '/' + yyyy;


exports.email_otp = async (req, res) => {
    try {
        let email = req.body.email;
        if (email != '' && email != null) {
            let email_check = await db.query("SELECT * FROM users WHERE email = " + db.pool.escape(email));
            if (!email_check.length) {
                let data = { email: email, msg: "Signup OTP" };
                let otp_result = await otp_fun.otp_gen(data);
                res.status(200).send(otp_result);
            } else {
                res.status(200).send({ success: false, msg: 'Email is already registered', data: {}, errors: '' });
            }
        } else {
            res.status(200).send({ success: false, msg: 'Please enter a valid email', data: {}, errors: '' });
        }
    } catch (err) {
        res.status(500).send({ success: false, msg: 'Error', data: {}, errors: err });
    }
};

exports.signup = async (req, res) => {
    let username = req.body.username;
    let email = req.body.email;
    let password = req.body.password;
    let re_password = req.body.re_password;
    let referral = req.body.referral_name;
    let email_otp = req.body.otp;
    if (username != null || username != undefined || username != '' && email != null || email != undefined || email != '') {
        if (password == re_password) {
            let username_check = await db.query("SELECT * FROM users WHERE username = " + db.pool.escape(username));
            if (!username_check.length) {
                let email_check = await db.query("SELECT * FROM users WHERE email = " + db.pool.escape(email));
                if (!email_check.length) {
                    if (email_otp != '' && email_otp != null && email_otp != undefined) {
                        let email_data = { email: email, otp: email_otp, name: username };
                        let email_otp_result = await otp_fun.otp_verify(email_data);
                        console.log("email_otp_result", email_otp_result);
                        if (email_otp_result['success']) {
                            let check_refferal_pause = await db.query(`SELECT * FROM referral`);
                            if (check_refferal_pause.length) {
                                if (check_refferal_pause[0].ref_pause == "false") {
                                    if (referral != '' && referral != null && referral != undefined) {
                                        let check_referral = await db.query(`SELECT * from users WHERE  username  = '${referral}'`);
                                        console.log(check_referral);
                                        if (check_referral.length) {
                                            await db.query(`UPDATE users SET referral_bonus = ${check_referral[0].referral_bonus + 1} WHERE username = '${referral}'`);
                                            await db.query(`INSERT INTO transactions (user_id, wallet_address, type, tron_amount, token_amount, fromUser) VALUES (${check_referral[0].id}, '${check_referral[0].wallet_address}', 'Received Referral Bonus', 0, 1, '${check_referral[0].username}')`);
                                            let check = await userSignup(username, email, password, referral, check_referral[0].id, check_referral[0].email, check_referral[0].wallet_address);
                                            if (check == true) {
                                                res.status(200).send({ success: true, msg: "Successfully registered", errors: "", registered: true });
                                                return;
                                            } else {
                                                res.status(200).send({ success: false, msg: "Error in registering User", data: {}, errors: "" });
                                                return;
                                            }
                                        } else {
                                            res.status(200).send({ success: false, msg: "Entered referral username is wrong or not exist", data: {}, errors: "" });
                                            return;
                                        }
                                    } else {
                                        let check = await userSignup(username, email, password, referral, 0, 0, 0);
                                        if (check == true) {
                                            res.status(200).send({ success: true, msg: "Successfully registered", errors: "", registered: true });
                                            return;
                                        } else {
                                            res.status(200).send({ success: false, msg: "Error in registering User", data: {}, errors: "" });
                                            return;
                                        }
                                    }
                                } else {
                                    let check = userSignup(username, email, password, referral, 0, 0, 0);
                                    if (check == true) {
                                        res.status(200).send({ success: true, msg: "Successfully registered", errors: "", registered: true });
                                        return;
                                    } else {
                                        res.status(200).send({ success: false, msg: "Error in registering User", data: {}, errors: "" });
                                        return;
                                    }
                                }
                            } else {
                                let check = userSignup(username, email, password, referral, 0, 0, 0);
                                if (check == true) {
                                    res.status(200).send({ success: true, msg: "Successfully registered", errors: "", registered: true });
                                    return;
                                } else {
                                    res.status(200).send({ success: false, msg: "Error in registering User", data: {}, errors: "" });
                                    return;
                                }
                            }

                        } else {
                            res.status(200).send({ success: false, msg: "Wrong OTP or Error in verifying otp, Please resend the otp again", data: "Wrong OTP", errors: "" });
                            return;
                        }
                    } else {
                        res.status(200).send({ success: false, msg: "Enter the OTP!", data: {}, errors: "" });
                        return;
                    }
                } else {
                    res.status(200).send({ success: false, msg: "Email is already registered!", data: {}, errors: "" });
                    return;
                }
            } else {
                res.status(200).send({ success: false, msg: 'Username Already Taken!', data: {}, errors: '' });
                return;
            }
        } else {
            res.status(200).send({ success: false, msg: 'Password Mismatch!', data: {}, errors: '' });
            return;
        }

    } else {
        res.status(200).send({ success: false, msg: 'Missing username and email field!', data: {}, errors: '' });
        return;
    }


}

async function userSignup(username, email, password, referral, referral_id, referral_email, referral_address) {
    let account, sql;
    let countusers = await db.query("SELECT * from users");
    if (countusers.length == 0) {
        account = await hdWallet.generateAccountsWithMnemonic(process.env.mnenomic, 1);
    } else {
        let length = countusers[countusers.length - 1];
        account = await hdWallet.generateAccountsWithMnemonic(process.env.mnenomic, length.id + 1);
    }
    let acc_detail = (Object.values(account));
    let acc = acc_detail[acc_detail.length - 1];
    if (referral_id != 0 && referral_id != '') {
        sql = await db.query(`INSERT INTO users( username, email, password, referral_name, referral_bonus, wallet_address, private_key, deposit_bal, release_amt) VALUES ( '${username}','${email}', '${sha256(password)}', '${referral}', 1, '${acc.address}', '${acc.privateKey}', 0, 0)`);
    } else {
        sql = await db.query(`INSERT INTO users( username, email, password, referral_name, referral_bonus, wallet_address, private_key, deposit_bal, release_amt) VALUES ( '${username}','${email}', '${sha256(password)}', '${referral}', 0, '${acc.address}', '${acc.privateKey}', 0, 0)`);
    }
    if (sql) {
        if (referral_id != 0 && referral_id != '' && referral_email != 0 && referral_address != 0) {
            await db.query(`INSERT INTO transactions (wallet_address, type, tron_amount, token_amount) VALUES ('${acc.address}', 'Received Signup Bonus', 0, 1)`);

            let htmlContent = "<p>Dear " + referral_email + ",</p>";
            htmlContent = htmlContent + "<br><p>Congrats, you got the 1 PUNO coin.</br>";
            await emailSend.WithdrawEmail(referral_email, "GET Rewards", htmlContent);
        }
        let htmlContent = "<p>Dear " + username + ",</p>";
        htmlContent = htmlContent + "<br><p>Congrats, you got the 1 PUNO coin.</br>";
        await emailSend.WithdrawEmail(email, "GET Rewards", htmlContent);
        return true;
    } else {
        return false;
    }
}

exports.login = async (req, res) => {
    try {
        let user = req.body.user;
        let password = req.body.password;
        let loginType = req.body.loginType;
        console.log(user, password, loginType);
        let userDetail;
        if (loginType == 'mobile') {
            userDetail = await db.query("SELECT * FROM users WHERE phoneNumber = " + db.pool.escape(user));
        } else {
            userDetail = await db.query("SELECT * FROM users WHERE email = " + db.pool.escape(user));
        }
        if (userDetail.length) {
            let hash = userDetail[0].password;
            if (sha256(password) == hash) {
                res.status(200).json({ success: true, msg: 'Successfully logged In!', user: userDetail, errors: '' })
            }
            else {
                res.status(200).send({ success: false, msg: 'Invalid password', data: {}, errors: '' });
            }
        } else {
            if (loginType == 'mobile') {
                res.status(200).send({ success: false, msg: 'Mobile number not found', data: {}, errors: '' });
            } else {
                res.status(200).send({ success: false, msg: 'Email not found', data: {}, errors: '' });
            }
        }
    } catch (err) {
        console.log('in login function error');
        console.log(err);
        res.status(500).send({ success: false, msg: 'Error', data: {}, errors: err });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        let currentpassword = req.body.current_password;
        let currenthash = sha256(currentpassword);
        let newpassword = req.body.new_password;
        let confirmnewpassword = req.body.confirm_new_password;
        let userID = req.body.userId;
        let id_check = await db.query("SELECT * FROM users WHERE id = " + userID);
        if (id_check.length) {
            if (id_check[0].password == currenthash) {
                if (newpassword == confirmnewpassword) {
                    let hash = sha256(newpassword);
                    let sql = await db.query(`UPDATE users SET password = '${hash}' WHERE id = ${userID}`);
                    if (sql) {
                        res.status(200).send({ success: true, msg: 'Profile Successfully Updated', data: {}, errors: '' });
                    } else {
                        res.status(200).send({ success: false, msg: 'Error In Profile Updated', data: {}, errors: '' });
                    }
                } else {
                    res.status(200).send({ success: false, msg: 'Password Mismatch!', data: {}, errors: '' });
                }
            } else { res.status(200).send({ success: false, msg: 'Current password is wrong', data: {}, errors: '' }); }
        } else {
            res.status(200).send({ success: false, msg: 'User does not exist.', data: {}, errors: '' });
        }
    } catch (err) {
        console.log('in login function error');
        console.log(err);
        res.status(500).send({ success: false, msg: 'Error', data: {}, errors: err });
    }
};

exports.forget_password_get_otp = async (req, res) => {
    try {
        let email = req.body.email;
        let type = req.body.type;
        let userData;
        if (type == 'email') {
            userData = await db.query("SELECT * FROM `users` WHERE `email` LIKE " + db.pool.escape(email) + ";");
        }
        else {
            userData = await db.query("SELECT * FROM `users` WHERE `phoneNumber` LIKE " + db.pool.escape(email) + ";");
        }
        if (userData.length) {
            let tx_id = userData[0].id + "" + Math.floor(Date.now() / 1000);
            let data = { user_id: userData[0].id, user: email, tx_id: tx_id, msg: 'Forget Password' };
            let otp_result;
            if (type == 'email') {
                otp_result = await otp_fun.otp_gen(data);
            }
            else {
                otp_result = await otp_fun.otp_gen_phone(data);
            }
            if (otp_result['success']) {
                res.status(200).send({ success: true, msg: 'An OTP sent to your email.', data: { tx_id: tx_id }, errors: '' });
            } else {
                res.status(200).send(otp_result);
            }
        } else {
            res.status(200).send({ success: false, msg: 'No match found', data: {}, errors: '' });
        }
    } catch (err) {
        console.log('in forget_password_get_otp function error');
        console.log(err);
        res.status(500).send({ success: false, msg: 'Error', data: {}, errors: err });
    }
};

exports.forget_password_verify_otp = async (req, res) => {
    try {
        let user;
        let data = req.body.email;
        let password = req.body.password;
        let re_password = req.body.re_password;
        let otp = req.body.otp;
        let type = req.body.type;
        if (password == re_password) {
            let password_hash = sha256(password);
            if (type == 'email') {
                user = await db.query("SELECT * FROM `users` WHERE `email` LIKE " + db.pool.escape(data) + ";");
            }
            else {
                user = await db.query("SELECT * FROM `users` WHERE `phoneNumber` LIKE " + db.pool.escape(data) + ";");
            }
            let otp_details = await db.query("SELECT * FROM `otp` WHERE otp LIKE " + otp + " OR user_id LIKE " + user[0].id + ";");
            let tx_id = otp_details[0].tx_id;
            if (user.length) {
                let email = user[0].email;
                let phone = user[0].phoneNumber;
                let data = { email: email, otp: otp, tx_id: tx_id, user_id: user[0].id, type: type, phone: phone };
                let otp_result = await otp_fun.otp_verify(data);
                console.log("otp", otp_result);
                if (otp_result['success']) {
                    let user = await db.query("UPDATE `users` SET `password` = '" + password_hash + "' WHERE `users`.`email` = " + db.pool.escape(email) + ";");
                    if (user.affectedRows == 1) {
                        res.status(200).send({ success: true, msg: 'Password successfully changed.', data: {}, errors: '' });
                    } else {
                        res.status(200).send({ success: false, msg: 'Error', data: {}, errors: '' });
                    }
                }
                else {
                    res.status(200).send(otp_result);
                }
            }
            else {
                res.status(200).send({ success: false, msg: 'No user found', data: {}, errors: '' });
            }
        }
        else {
            res.status(200).send({ success: false, msg: 'Password not match' });
        }
    } catch (err) {
        console.log('in forget_password_verify_otp function error');
        console.log(err);
        res.status(500).send({ success: false, msg: 'Error', data: {}, errors: err });
    }
};

exports.invest = async (req, res) => {
    let user_id = req.body.user_id;
    let amount = req.body.amount;
    let user_details = await db.query("SELECT * FROM users WHERE id = " + user_id);
    let client = require('twilio')(accountSid, authToken);
    if (user_details.length) {
        let trongrid = new TronWeb(fullNode, solidityNode, eventServer, user_details[0].private_key);
        let instance = await trongrid.contract().at(contractaddress);
        let bal = await trongrid.trx.getBalance(user_details[0].wallet_address);
        if (bal != 0 && bal > amount * 10 ** 6) {
            let paused = await instance.methods.paused().call();
            if (paused != true) {
                await instance.invest().send({ callValue: amount * 10 ** 6 }).then(async () => {
                    setTimeout(async function () {
                        let length = await instance.getUserDetails(user_details[0].wallet_address).call();
                        let data = await instance.getInvestDetails(user_details[0].wallet_address, trongrid.toDecimal(length[1])).call();
                        let check_refferal_pause = await db.query(`SELECT * FROM referral`);
                        if (check_refferal_pause[0].ref_pause == "false") {
                            if (user_details[0].referral_name != null) {
                                let referral_details = await db.query(`SELECT * FROM users WHERE username =  '${user_details[0].referral_name}'`);
                                if (referral_details.length) {
                                    let referral_per = referral_details[0].referral_bonus + (await trongrid.toDecimal(data[0]) / 10 ** 6) * (8 / 100);
                                    await db.query(`UPDATE users SET referral_bonus = ${referral_per} WHERE username = '${user_details[0].referral_name}'`);
                                    await db.query(`INSERT INTO transactions (user_id, wallet_address, type, tron_amount, token_amount,fromUser) VALUES (${referral_details[0].id}, '${referral_details[0].wallet_address}', 'Received Referral Bonus ', 0, ${(await trongrid.toDecimal(data[0]) / 10 ** 6) * (8 / 100)} ,'${user_details[0].username}')`);
                                    let htmlContent = "<p>Dear " + referral_details[0].username + ",</p>";
                                    htmlContent = htmlContent + "<p>You received the reward coins " + (trongrid.toDecimal(data[0]) / 10 ** 6) * (8 / 100) + " PUNO coin has been credited.</p>";
                                    let otp_result = await emailSend.WithdrawEmail(referral_details[0].email, "Received Bonus", htmlContent);
                                    if (referral_details[0].phoneNumber != '0') {
                                        client.messages
                                            .create({
                                                body: 'Dear Customer, You received the ' + (trongrid.toDecimal(data[0]) / 10 ** 6) * (8 / 100) + ' PUNO coin has been credited.</p></br>',
                                                from: process.env.from,
                                                to: '+918949470347'
                                            })
                                            .then(message => console.log(message.sid))
                                            .done();
                                    }
                                }
                            }
                        }
                        await db.query(`INSERT INTO transactions (user_id, wallet_address, type, tron_amount, token_amount) VALUES (${user_id}, '${user_details[0].wallet_address}', 'Invest', ${amount}, ${trongrid.toDecimal(data[0]) / 10 ** 6})`);

                        let htmlContent = "<p>Dear " + user_details[0].username + ",</p><p>This email is sent you for the purpose to verify that this is you, who doing action.</p>";
                        htmlContent = htmlContent + "<p>You Successfully Invested " + amount + " TRX in the PUNO Finance and amount has been debited from your account on " + today + ".</p>";
                        htmlContent = htmlContent + "<p>You got the " + trongrid.toDecimal(data[0]) / 10 ** 6 + " PUNO coin that has been locked in, According to the contract condtions for 6 months from today ownwards.After successful completion of lock period you can withdraw the coins from website.</p></br>";

                        await emailSend.WithdrawEmail(user_details[0].email, "Purchased Puno", htmlContent);
                        if (user_details[0].phoneNumber != '0') {
                            client.messages
                                .create({
                                    body: 'Dear Customer, ' + amount + ' TRX has been debited to your account on ' + today + ' You got the ' + trongrid.toDecimal(data[0]) / 10 ** 6 + ' PUNO coin that has been locked in, according to the contract condtions for 6 months from today ownwards. After successful completion of lock period you can withdraw the coins from website.',
                                    from: process.env.from,
                                    to: '+918949470347'
                                })
                                .then(message => console.log(message.sid))
                                .done();
                        }
                        let updated_bal = (bal / 10 ** 6) - amount;
                        await db.query(`UPDATE users SET deposit_bal=${updated_bal} WHERE id = ${user_id}`)
                        res.status(200).send({ success: true, msg: 'Invested Successfully ', data: {}, errors: '' });
                        return;
                    }, 4000);
                });
            } else {
                res.status(200).send({ success: false, msg: 'Sale is Paused', data: {}, errors: '' });
                return;
            }
        } else {
            res.status(200).send({ success: false, msg: 'Not enough balance in your wallet ', data: {}, errors: '' });
            return;
        }
    } else {
        res.status(200).send({ success: false, msg: 'User does not exist.', data: {}, errors: '' });
        return;
    }
}

exports.withdrawal = async (req, res) => {
    let user_id = req.body.user_id;
    let amount = req.body.amount;
    let type = req.body.type;
    let wallet_address = req.body.wallet_address;
    let user_details = await db.query("SELECT * from users WHERE id =" + user_id);
    let refBonus = 0;
    const client = require('twilio')(accountSid, authToken);
    if (user_details.length) {
        let trongrid = new TronWeb(fullNode, solidityNode, eventServer, user_details[0].private_key);
        let instance = await trongrid.contract().at(contractaddress);
        if (type == 'puno' && wallet_address != null) {
            await instance.withdrawal(wallet_address, amount * 10 ** 6).send().then(async () => {
                setTimeout(async function () {
                    let events = await trongrid.getEventResult(contractaddress, { eventName: "Withdraw", size: 1 })
                    if (events != '') {
                        let transaction = await trongrid.trx.getUnconfirmedTransactionInfo(events[0].transaction);
                        if (transaction.receipt.result == "SUCCESS") {

                            let sql = await db.query(`INSERT INTO transactions (user_id, wallet_address, to_wallet, type, tron_amount, token_amount) VALUES (${user_id}, '${user_details[0].wallet_address}', '${wallet_address}','Withdraw Puno', 0 , ${amount})`);
                            if (sql) {
                                let sql_send = await db.query(`INSERT INTO transactions (user_id, wallet_address, to_wallet, type, tron_amount, token_amount, fromUser) VALUES (0, '${wallet_address}', 0,'Receive PUNO', 0 , ${amount}, '${user_details[0].wallet_address}')`);
                                console.log("sql_sendsql_sendsql_send", sql_send);
                                // await db.query(`UPDATE users SET release_amt = ${user_details[0].release_amt - amount} WHERE id = ${user_id}`);
                                let htmlContent = "<p>Dear " + user_details[0].username + ",</p><p>This email is sent you for the purpose to verify that this is you, who doing action.</p>";
                                htmlContent = htmlContent + "<p>" + amount + " PUNO has been debited from your account on " + today + "</p>";
                                let otp_result = await emailSend.WithdrawEmail(user_details[0].email, "Withdraw PUNO coin", htmlContent);
                                if (user_details[0].phoneNumber != '0') {
                                    client.messages
                                        .create({
                                            body: 'Dear Customer, ' + amount + ' PUNO has been debited to your account on ' + today,
                                            from: process.env.from,
                                            to: '+918949470347'  // user_details[0].phoneNumber
                                        })
                                        .then(message => console.log(message.sid))
                                        .done();
                                }
                                res.status(200).send({ success: true, msg: 'Withdraw Successfully ', data: otp_result, errors: '' });
                            }
                            else {
                                res.status(200).send({ success: false, msg: 'Error', data: {}, errors: '' });
                            }
                        }
                    } else {
                        res.status(200).send({ success: false, msg: 'Error in withdraw', data: {}, errors: '' });
                    }
                }, 3000);
            });

        } else if (type == 'tron' && wallet_address != null) {
            let bal = await trongrid.trx.getBalance(user_details[0].wallet_address);
            if (bal != 0 && bal > amount * 10 ** 6) {
                let send_transaction = await trongrid.trx.sendTransaction(wallet_address, amount * 10 ** 6);
                if (send_transaction.result == true) {
                    await db.query(`INSERT INTO transactions (user_id, wallet_address, to_wallet,type, tron_amount, token_amount) VALUES (${user_id}, '${user_details[0].wallet_address}','${wallet_address}','Withdraw TRX', ${amount}, 0)`);
                    let htmlContent = "<p>Dear " + user_details[0].username + ",</p><p>This email is sent you for the purpose to verify that this is you, who doing action<p>";
                    htmlContent = htmlContent + "<p>" + amount + " TRX, has been debited from your account on " + today + " and sent to the account " + wallet_address + " Avl. Bal: " + await trongrid.trx.getUnconfirmedBalance(user_details[0].wallet_address) / 10 ** 6 + "TRX</p>";
                    let sql_send = await db.query(`INSERT INTO transactions (user_id, wallet_address, to_wallet, type, tron_amount, token_amount, fromUser ) VALUES (0, '${wallet_address}', 0,'Receive TRX', ${amount}, 0, '${user_details[0].wallet_address}')`);
                    console.log("sql_sendsql_sendsql_send", sql_send);
                    let otp_result = await emailSend.WithdrawEmail(user_details[0].email, " Transfer TRX ", htmlContent);
                    if (user_details[0].phoneNumber != '0') {
                        client.messages
                            .create({
                                body: 'Dear Customer, ' + amount + ' TRX has been debited to your account on ' + today,
                                from: process.env.from,
                                to: '+918949470347'
                            })
                            .then(message => console.log(message.sid))
                            .done();
                    }
                    await db.query(`UPDATE users SET deposit_bal=${(bal / 10 ** 6) - amount} WHERE id = ${user_id}`);
                    res.status(200).send({ success: true, msg: 'Transfer tron to your wallet ', data: otp_result, errors: '' });
                } else {
                    res.status(200).send({ success: false, msg: 'Transaction not confirm', data: {}, errors: '' });
                }
            } else {
                res.status(200).send({ success: false, msg: 'Not enough balance in your wallet ', data: {}, errors: '' });
            }

        } else if (type == 'referral' && wallet_address != null) {
            let referalData = await db.query(`SELECT * from users WHERE referral_name = '${user_details[0].username}'`);
            console.log("referalData", referalData);
            for (let i = 0; i < referalData.length; i++) {
                let referalList = await db.query(`SELECT * from transactions WHERE type = 'Invest' AND user_id = ${referalData[i].id}`);
                if (referalList.length) {
                } else {
                    refBonus++;
                }
            }
            if (user_details[0].referral_bonus > 0) {
                if (user_details[0].referral_bonus >= amount && amount >= 10) {
                    console.log("user_details[0].referral_bonus - refBonus", user_details[0].referral_bonus, refBonus, amount);
                    if (user_details[0].referral_bonus - refBonus > amount) {
                        let send_transaction = await rewardtronGrid.trx.sendTransaction(wallet_address, amount * 10 ** 6);
                        if (send_transaction.result == true) {
                            await db.query(`UPDATE users SET referral_bonus = ${user_details[0].referral_bonus - amount}  WHERE id = ${user_id}`)
                            await db.query(`INSERT INTO transactions (user_id, wallet_address,to_wallet, type, tron_amount, token_amount) VALUES (${user_id}, '${user_details[0].wallet_address}','${wallet_address}', 'Withdraw Referral Bonus', 0, ${amount})`);
                            let htmlContent = "<p>Dear " + user_details[0].username + ",</p><p>This email is sent you for the purpose to verify that this is you, who doing action</p>";
                            htmlContent = htmlContent + "<p>" + amount + " Bonus coin, has been debited from your account on " + today + " and sent to the account " + wallet_address + "</p>";
                            let otp_result = await emailSend.WithdrawEmail(user_details[0].email, "Withdraw Referral Bonus", htmlContent);
                            let sql_send = await db.query(`INSERT INTO transactions (user_id, wallet_address, to_wallet, type, tron_amount, token_amount, fromUser ) VALUES (0, '${wallet_address}', 0,'Receive TRX', ${amount}, 0, '${user_details[0].wallet_address}')`);
                            console.log("sql_sendsql_sendsql_send", sql_send);
                            if (user_details[0].phoneNumber != '0') {
                                client.messages
                                    .create({
                                        body: 'Dear Customer, ' + amount + ' PUNO has been debited to your account on ' + today,
                                        from: process.env.from,
                                        to: '+918949470347'
                                    })
                                    .then(message => console.log(message.sid))
                                    .done();
                            }
                            res.status(200).send({ success: true, msg: 'Transfer Puno to your wallet ', data: otp_result, errors: '' });
                        } else {
                            res.status(200).send({ success: false, msg: 'Transaction not confirm', data: {}, errors: '' });
                        }
                    } else {
                        res.status(200).send({ success: false, msg: 'Not Enough Referral Bonus of active users', data: {}, errors: '' });
                    }

                } else {
                    res.status(200).send({ success: false, msg: 'Minimum withdrawal amount is 10 PUNO. ', data: {}, errors: '' });
                }
            } else {
                res.status(200).send({ success: false, msg: 'Not Enough Referral Bonus ', data: {}, errors: '' });
            }
        }
    } else {
        res.status(200).send({ success: false, msg: 'User does not exist.', data: {}, errors: '' });
    }
}

exports.downline = async (req, res) => {
    let wallet_address = req.query.wallet_address;
    let temp = await db.query(`SELECT * FROM users WHERE wallet_address = '${wallet_address}'`)
    let resultArray = [];
    if (temp.length) {
        let result = await db.query(`select *  from users where referral_name = '${temp[0].username}'`);
        // resultArray.push(result);
        if (result.length) {
            for (let i = 0; i < result.length; i++) {
                let temp1 = await db.query(`select sum(token_amount) AS sum from transactions where type = 'Received Referral Bonus' AND fromUser = '${result[i].username}'`);
                resultArray.push({ "amt": temp1, "res": result[i] });
            }
        }


        // let result = await db.query(`Select *  from users where referral_name = '${temp[0].username}'`);
        // let result2 = await db.query(`Select * from transactions where user_id = ${temp[0].id} and type = 'Received Referral Bonus'`);
        if (temp.length != 0) {
            res.status(200).send({ success: true, msg: 'Downline..', data: resultArray, data1: temp, errors: '' });
        } else {
            res.status(200).send({ success: false, msg: 'Downline..', errors: '' });
        }
    }
}

exports.fetchDetails = async (req, res) => {
    let where;
    let data = req.query.data;
    let filter = req.query.filter;
    let item = req.query.item;
    if (item != '' && data != '') {
        where = `${item} = '${data}' `;
    }
    else {
        where = '';
    }
    if (where == '') {
        let info = await db.query(`SELECT * FROM ${filter}`);
        res.status(200).send({ success: true, msg: 'Fetched Data', data: info, error: '' });
    } else {
        let info = await db.query(`SELECT * FROM ${filter} WHERE ${where}`);
        res.status(200).send({ success: true, msg: 'Fetched Data', data: info, error: '' });
    }
};

exports.deposit = async (req, res) => {
    try {
        let user_id = req.query.user_id;
        let user_details = await db.query("SELECT * FROM users WHERE id = " + user_id);
        if (user_details) {
            let deposit_bal = user_details[0].deposit_bal;
            let trongrid = new TronWeb(fullNode, solidityNode, eventServer, user_details[0].private_key);
            let check_bal = await trongrid.trx.getUnconfirmedBalance(user_details[0].wallet_address);
            let bal = check_bal / 10 ** 6;
            let amount = bal - deposit_bal;
            if (bal > deposit_bal) {
                let deposit = await db.query(`UPDATE users SET deposit_bal=${bal} WHERE id = ${user_id}`);
                if (deposit) {
                    let sql = await db.query(`INSERT INTO transactions (user_id, wallet_address, type, tron_amount,token_amount) VALUES (${user_id}, '${user_details[0].wallet_address}', 'Deposit', ${amount},'0')`);
                    if (sql) {
                        res.status(200).send({ success: true, msg: 'Deposited Successfully', data: {}, errors: '' });
                    } else {
                        res.status(205).send({ success: false, msg: 'something went wrong', data: {}, errors: '' });
                    }
                }
            } else {
                res.status(201).send({ success: false, msg: 'No data to deposit', data: {}, errors: '' });
            }
        } else {
            res.status(202).send({ success: false, msg: 'User not found', data: {}, errors: '' });
        }

    } catch (err) {
        res.status(204).send({ success: false, msg: 'something went wrong', data: {}, errors: '' });
    }

}

exports.transfer = async (req, res) => {
    let transferToken = req.query.transferToken;
    let transferAddress = req.query.transferAddress;
    let user_id = req.query.id;
    let user_details = await db.query("SELECT * FROM users WHERE id = " + user_id);
    if (user_details.length) {
        let trongrid = new TronWeb(fullNode, solidityNode, eventServer, user_details[0].private_key);
        let instance = await trongrid.contract().at(token_address);
        let bal = await instance.balanceOf(user_details[0].wallet_address).call();
        if (bal > 0 && bal > transferToken) {
            let transfer = await instance.transfer(transferAddress, transferToken * 10 ** 6).send();
            let events = await tronGrid.getEventResult(token_address, { eventName: "Transfer", size: 1 });
            if (events) {
                let transaction = await tronGrid.trx.getUnconfirmedTransactionInfo(events[0].transaction);
                console.log(transaction)
                if (transaction.receipt.result == "SUCCESS") {
                    await db.query(`INSERT INTO transactions (user_id, wallet_address, to_wallet, type, tron_amount, token_amount) VALUES ( ${user_id} ,'${user_details[0].wallet_address}', '${transferAddress}', 'Transfer Tokens', 0, ${transferToken})`);
                    await db.query(`INSERT INTO transactions (user_id, wallet_address, to_wallet, type, tron_amount, token_amount, fromUser) VALUES ( 0,'${transferAddress}',  'null', 'Received Tokens', 0, ${transferToken}, '${user_details[0].wallet_address}')`);
                    res.status(200).send({ success: true, msg: 'Successfully transfer the tokens', data: {}, errors: '' });
                } else {
                    res.status(200).send({ success: false, msg: 'Something went wrong', data: {}, errors: '' });
                }
            } else {
                res.status(200).send({ success: false, msg: 'Error ', data: {}, errors: '' });
            }
        } else {
            res.status(202).send({ success: false, msg: 'Not enough tokens in your wallet', data: {}, errors: '' });
        }
    } else {
        res.status(202).send({ success: false, msg: 'User not found', data: {}, errors: '' });
    }

}


exports.coinbal = async (req, res) => {
    try {
        let wallet_address = req.query.wallet_address;

        let sql = await db.query(`SELECT sum(token_amount) AS sum  FROM transactions WHERE wallet_address = '${wallet_address}' and type ='Invest'`);
        // console.log(sql)
        let instance = await tronGrid.contract().at(contractaddress);
        let user = await instance.methods.getUserDetails(wallet_address).call();
        let user_details = await instance.viewReleaseAmount(wallet_address).call();
        let releaseAmount = tronGrid.toDecimal((user_details._hex));
        console.log((await tronGrid.toDecimal((user[2]._hex))) / 10 ** 6)
        console.log(sql[0].sum - (await tronGrid.toDecimal((user[2]._hex))) / 10 ** 6)
        if (sql.length) {
            res.status(200).send({ success: true, msg: 'User exist.', 'releaseAmt': tronGrid.toDecimal(user_details._hex) / 10 ** 6, data: sql[0].sum - releaseAmount / 10 ** 6 - (await tronGrid.toDecimal((user[2]._hex))) / 10 ** 6, data1: (await tronGrid.toDecimal((user[2]._hex))) / 10 ** 6, errors: '' });
        } else {
            res.status(200).send({ success: false, msg: 'User does not exist.', data: {}, errors: '' });

        }
    } catch (err) {
        res.status(500).send({ success: false, msg: 'User does not exist.', data: {}, errors: '' });

    }

}

exports.transactionDetails = async (req, res) => {
    let wallet_address = req.query.wallet_address;
    let type = req.query.type;
    let amount = req.query.tron_amount;
    let token_amount = req.query.token_amount;
    let to = req.query.to;
    let fromUser = req.query.from;
    if (wallet_address != '' && type != '' && amount != '') {
        let sql = await db.query(`INSERT INTO transactions (wallet_address, to_wallet, type, tron_amount, token_amount, fromUser) VALUES ('${wallet_address}', '${to}','${type}', ${amount}, ${token_amount}, '${fromUser}')`);
        if (sql) {
            res.status(200).send({ success: true, msg: 'Save Transaction Details', error: '' });
        }
        else {
            res.status(200).send({ success: false, msg: 'Error', 'sql': sql, data: {}, error: '' });
        }
    } else {
        res.status(200).send({ success: false, msg: 'Empty Fields', 'sql': sql, data: {}, error: '' });
    }
}

async function investEvent() {
    let events = await tronGrid.getEventResult(contractaddress, { eventName: "Invested" });
    if (events.length) {
        events.forEach(async function (event) {
            console.log(event.result[0]);
            let sql = await db.query(`SELECT * FROM invest WHERE transaction_hash = '${event.transaction}'`);
            if (sql.length == 0) {
                await db.query(`INSERT INTO invest (wallet_address, transaction_hash, invest_amt, token_amt, time) VALUES ('${event.result.investor}', '${event.transaction}', '${event.result.investAmount / 10 ** 6}', '${event.result.tokenAmount / 10 ** 6}', '${event.timestamp / 1000}')`);
            }
        })
    }
}
investEvent();

exports.getDetails = async (req, res) => {
    let instance = await tronGrid.contract().at(contractaddress);
    let price = await instance.methods.price().call();
    price = await tronGrid.toDecimal(price) / 10 ** 6
    let startTime = await instance.methods.startTime().call();
    startTime = await tronGrid.toDecimal(startTime);
    let endTime = await instance.methods.endTime().call();
    endTime = await tronGrid.toDecimal(endTime);
    let soldtokens = await instance.methods.getSoldTokens().call();
    soldtokens = await tronGrid.toDecimal(soldtokens) / 10 ** 6;
    console.log(price, startTime, endTime);
    res.status(200).send({ success: true, msg: 'Details', data: price, startTime, endTime, soldtokens, error: '' });
}

exports.Alldownline = async (req, res) => {
    let temp = await db.query(`SELECT * FROM users WHERE referral_name != '' ORDER BY referral_name`);
    let resultArray = [];
    if (temp.length) {
        for (let i = 0; i < temp.length; i++) {
            let result = await db.query(`select *  from users where username = '${temp[i].referral_name}'`);
            // resultArray.push(result);
            let temp1 = await db.query(`select sum(token_amount) AS sum from transactions where type = 'Received Referral Bonus' AND fromUser = '${temp[i].username}'`);
            resultArray[i] = { "res": temp[i], "amt": temp1, "address": result };
        }
        console.log("resultArrayyyyyyyyyyyyyyyyyy", resultArray);
        if (resultArray.length != 0) {
            res.status(200).send({ success: true, msg: 'Downline..', data1: resultArray, errors: '' });
        } else {
            res.status(200).send({ success: false, msg: 'Downline..', data1: resultArray, errors: '' });
        }
    } else {
        res.status(200).send({ success: false, msg: 'No referral found', errors: '' });
    }
}

exports.show_user = async (req, res) => {
    let user_id = req.query.user_id;
    let sql = await db.query(`SELECT * FROM users WHERE id = ${user_id}`);
    if (sql.length) {
        let trongrid = new TronWeb(fullNode, solidityNode, eventServer, sql[0].private_key);
        let instance = await trongrid.contract().at(token_address);
        let puno_bal = await instance.methods.balanceOf(sql[0].wallet_address).call();
        console.log(trongrid.toDecimal(puno_bal._hex))
        let bal = await trongrid.trx.getUnconfirmedBalance(sql[0].wallet_address);
        res.status(200).send({ success: true, msg: 'User exist.', data: sql, bal: bal / 10 ** 6, punobal: (trongrid.toDecimal(puno_bal._hex)) / 10 ** 6, errors: '' });
    } else {
        res.status(200).send({ success: false, msg: 'User does not exist.', data: {}, errors: '' });
    }
}




exports.chnggFunction = async (req, res) => {
    let amount = req.body.amount;
    let type = req.body.type;
    let instance = await tronGrid.contract().at(contractaddress);
    let tokenprice = await instance.methods.price().call();
    let price = tronGrid.toDecimal(tokenprice._hex);
    if (type == 'TRX') {
        let tokens = ((amount * 10 ** 12) / price);
        res.status(200).send({ success: true, msg: 'Success', tron: amount, token: tokens / 10 ** 6, errors: '' });
    } else {
        let amt = amount * price;
        res.status(200).send({ success: true, msg: 'Success', tron: amt / 10 ** 6, token: amount, errors: '' });
    }
}

exports.investDetails = async (req, res) => {
    let result = [];
    let userId = req.body.userId;
    let instance = await tronGrid.contract().at(contractaddress);
    let user_details = await db.query(`SELECT * FROM users WHERE id = ${userId}`);
    if (user_details.length) {
        let getdetails = await instance.methods.getUserDetails(user_details[0].wallet_address).call();
        console.log(getdetails);
        let invest_length = tronGrid.toDecimal((getdetails[1]._hex));
        console.log("len", invest_length)
        if (invest_length != 0) {
            let getLockTime = await instance.methods.getLockTime().call();
            let get_lock_stamp = (tronGrid.toDecimal((getLockTime._hex))) * 1000;
            let check_refferal_pause = await db.query(`SELECT * FROM referral`);
            console.log(check_refferal_pause[0].ref_pause);
            for (var i = 1; i <= invest_length; i++) {
                let getInvestDetails = await instance.methods.getInvestDetails(user_details[0].wallet_address, i).call();
                let puno_tokens = tronGrid.toDecimal(getInvestDetails[0]._hex);
                let invest_trx = tronGrid.toDecimal(getInvestDetails[1]._hex);
                let buy_stamp = tronGrid.toDecimal((getInvestDetails[2]._hex)) * 1000;
                let unlock_stamp = buy_stamp + get_lock_stamp;
                let invest = [puno_tokens, invest_trx, buy_stamp, unlock_stamp];
                result.push(invest);
            }
            console.log("x", result)
            if (result) {
                res.status(200).send({ success: true, msg: 'Invested Details', data: result, refPause: check_refferal_pause[0].ref_pause, referralid: user_details[0].referral_name, errors: '' });
            }
        } else {
            res.status(200).send({ success: true, msg: 'No invested yet', data: {}, errors: '' });
        }
    } else {
        res.status(200).send({ success: false, msg: 'User does not exist.', data: {}, errors: '' });
    }
}


// Admin APIs

exports.setReferral = async (req, res) => {
    let referral_pause;
    let pause_check = await db.query(`SELECT * FROM referral`);
    if (pause_check.length) {
        console.log(pause_check[0].ref_pause)
        if (pause_check[0].ref_pause == 'true') {
            referral_pause = 'false';
            let sql = await db.query(`UPDATE referral SET ref_pause = '${referral_pause}'`);
            if (sql.affectedRows == 1) {
                res.status(200).send({ success: true, msg: 'Unpaused the referral', data: 'unpaused', errors: '' });
            } else {
                res.status(200).send({ success: false, msg: 'Error while paused the referral', errors: '' });
            }
        }
        else if (pause_check[0].ref_pause == 'false') {
            referral_pause = 'true';
            let sql = await db.query(`UPDATE referral SET ref_pause = '${referral_pause}'`);
            if (sql.affectedRows == 1) {
                res.status(200).send({ success: true, msg: 'Paused the referral', data: 'paused', errors: '' });
            } else {
                res.status(200).send({ success: false, msg: 'Error while paused the referral', errors: '' });
            }
        }
    } else {
        res.status(200).send({ success: false, msg: 'Error while paused the referral', errors: '' });
    }
}

exports.redeem = async (req, res) => {
    try {
        let amount = req.query.amount;
        let walletAddress = req.query.walletAddress;
        let instance = await tronGrid.contract().at(token_address);
        await instance.redeem(walletAddress, amount * 10 ** 6).send().then(
            setTimeout(async function () {
                await db.query(`INSERT INTO transactions (user_id, wallet_address, to_wallet, type, tron_amount, token_amount) VALUES ( 0 ,'${token_address}', '${transferAddress}', 'Redeem Locked Tokens', 0, ${transferToken})`);
                await db.query(`INSERT INTO transactions (user_id, wallet_address, to_wallet, type, tron_amount, token_amount, fromUser) VALUES ( 0,'${transferAddress}',  'null', 'Received Locked Tokens', 0, ${transferToken}, '${token_address}')`);
                res.status(200).send({ success: true, msg: 'Successfully redeem', errors: '' });
            }, 2000)
        );
    } catch (err) {
        res.status(500).send({ success: false, msg: 'Error ', data: {}, errors: '' });

    }


}

exports.getReferral = async (req, res) => {

    let pause_check = await db.query(`SELECT * FROM referral`);
    let instance = await tronGrid.contract().at(token_address);
    let gettokenlockTime = await instance.getTime().call();
    if (pause_check.length) {
        console.log(pause_check[0].ref_pause)

        if (pause_check[0].ref_pause == 'true') {
            res.status(200).send({ success: true, msg: 'Paused the referral', data: 'paused', getTokenLockTime: tronGrid.toDecimal(gettokenlockTime._hex), errors: '' });
        }
        else if (pause_check[0].ref_pause == 'false') {
            res.status(200).send({ success: true, msg: 'UnPaused the referral', data: 'Unpaused', getTokenLockTime: tronGrid.toDecimal(gettokenlockTime._hex), errors: '' });
        }
    } else {
        res.status(200).send({ success: false, msg: 'Error while paused the referral', getTokenLockTime: tronGrid.toDecimal(gettokenlockTime._hex), errors: '' });
    }
}
exports.changePrice = async (req, res) => {
    try {
        let amount = req.query.price;
        let instance = await tronGrid.contract().at(contractaddress);
        let setPrice = await instance.setRate(amount * 10 ** 6).send();
        let events = await tronGrid.getEventResult(contractaddress, { eventName: "RateChanged", size: 1 });
        console.log(events);
        if (events) {
            let transaction = await tronGrid.trx.getUnconfirmedTransactionInfo(events[0].transaction);
            if (transaction.receipt.result == "SUCCESS") {
                res.status(200).send({ success: true, msg: 'Successfully changed the token price ', data: {}, errors: '' });
            } else {
                res.status(200).send({ success: false, msg: 'Transaction Error', data: {}, errors: '' });
            }
        }
        else {
            res.status(200).send({ success: false, msg: 'Error while changed the token price', data: {}, errors: '' });
        }
    } catch (err) {
        res.status(500).send({ success: false, msg: 'Error while changed the token price', data: {}, errors: '' });

    }
}

exports.pause = async (req, res) => {
    try {
        let instance = await tronGrid.contract().at(contractaddress);
        let pause = await instance.pause().send();
        let events = await tronGrid.getEventResult(contractaddress, { eventName: "Paused", size: 1 });
        console.log(events);
        if (events) {
            let transaction = await tronGrid.trx.getUnconfirmedTransactionInfo(events[0].transaction);
            if (transaction.receipt.result == "SUCCESS") {
                res.status(200).send({ success: true, msg: 'Successfully Paused ', data: {}, errors: '' });
            } else {
                res.status(200).send({ success: false, msg: 'Something went wrong', data: {}, errors: '' });
            }
        }
        else {
            res.status(200).send({ success: false, msg: 'Error while Pause', data: {}, errors: '' });
        }
    } catch (err) {
        res.status(500).send({ success: false, msg: 'Error while Pause', data: {}, errors: '' });
    }
}

exports.unpause = async (req, res) => {
    try {
        let instance = await tronGrid.contract().at(contractaddress);
        let unpause = await instance.unpause().send();
        let events = await tronGrid.getEventResult(contractaddress, { eventName: "Unpaused", size: 1 });
        console.log(events);
        if (events) {
            let transaction = await tronGrid.trx.getUnconfirmedTransactionInfo(events[0].transaction);
            if (transaction.receipt.result == "SUCCESS") {
                res.status(200).send({ success: true, msg: 'Successfully unpaused ', data: {}, errors: '' });
            } else {
                res.status(200).send({ success: false, msg: 'Something went wrong', data: {}, errors: '' });
            }
        }
        else {
            res.status(200).send({ success: false, msg: 'Error while Unpause', data: {}, errors: '' });
        }
    } catch (err) {
        res.status(500).send({ success: false, msg: 'Error while Unpause', data: {}, errors: '' });
    }
}

exports.lockTime = async (req, res) => {
    try {
        let locktime = req.query.locktime;
        let instance = await tronGrid.contract().at(contractaddress);
        let setPrice = await instance.setLockTime(locktime).send();
        let events = await tronGrid.getEventResult(contractaddress, { eventName: "LockTimeChanged", size: 1 });
        console.log(events);
        if (events) {
            let transaction = await tronGrid.trx.getUnconfirmedTransactionInfo(events[0].transaction);
            if (transaction.receipt.result == "SUCCESS") {
                res.status(200).send({ success: true, msg: 'Successfully changed the lock time ', data: {}, errors: '' });
            } else {
                res.status(200).send({ success: false, msg: 'Something went wrong', data: {}, errors: '' });
            }
        }
        else {
            res.status(200).send({ success: false, msg: 'Error while changing  the lock time', data: {}, errors: '' });
        }
    } catch (err) {
        res.status(500).send({ success: false, msg: 'Error while changing  the lock time', data: {}, errors: '' });

    }
}

exports.startsAt = async (req, res) => {
    try {
        let startTime = req.query.startTime;
        let instance = await tronGrid.contract().at(contractaddress);
        let setPrice = await instance.setStartsAt(startTime).send();
        let events = await tronGrid.getEventResult(contractaddress, { eventName: "StartsAtChanged", size: 1 });
        console.log(events);
        if (events) {
            let transaction = await tronGrid.trx.getUnconfirmedTransactionInfo(events[0].transaction);
            if (transaction.receipt.result == "SUCCESS") {
                res.status(200).send({ success: true, msg: 'Successfully changed the start time', data: {}, errors: '' });
            } else {
                res.status(200).send({ success: false, msg: 'Something went wrong', data: {}, errors: '' });
            }
        }
        else {
            res.status(200).send({ success: false, msg: 'Error while changing  the start time', data: {}, errors: '' });
        }
    } catch (err) {
        res.status(500).send({ success: false, msg: 'Error while changing  the start time', data: {}, errors: '' });
    }
}

exports.endsAt = async (req, res) => {
    try {
        let endtime = req.query.endtime;
        let instance = await tronGrid.contract().at(contractaddress);
        let setPrice = await instance.setEndsAt(endtime).send();
        let events = await tronGrid.getEventResult(contractaddress, { eventName: "EndsAtChanged", size: 1 });
        console.log(events);
        if (events) {
            let transaction = await tronGrid.trx.getUnconfirmedTransactionInfo(events[0].transaction);
            if (transaction.receipt.result == "SUCCESS") {
                res.status(200).send({ success: true, msg: 'Successfully changed the end time', data: {}, errors: '' });
            } else {
                res.status(200).send({ success: false, msg: 'Something went wrong', data: {}, errors: '' });
            }
        }
        else {
            res.status(200).send({ success: false, msg: 'Error while changing  the end time', data: {}, errors: '' });
        }
    } catch (err) {
        res.status(500).send({ success: false, msg: 'Error while changing  the end time', data: {}, errors: '' });
    }
}

exports.transferTokens = async (req, res) => {
    try {
        let instance, owner, bal;
        let transferToken = req.query.transferToken;
        let transferAddress = req.query.transferAddress;
        let type = req.query.type;
        console.log(type)
        if (type == 'admin') {
            instance = await tronGrid.contract().at(token_address);
            let adminowner = await instance.owner().call();
            owner = await tronGrid.address.fromHex(adminowner);
            bal = await instance.balanceOf(owner).call();
        } else {
            instance = await rewardtronGrid.contract().at(token_address);
            owner = 'TXEyomNh9JnUmDq9acJSNYmtp5XtHMmgEy';
            bal = await instance.balanceOf(owner).call();
        }
        if (bal > 0 && bal > transferToken) {
            let transfer = await instance.transfer(transferAddress, tronGrid.toSun(transferToken)).send();
            let events = await tronGrid.getEventResult(token_address, { eventName: "Transfer", size: 1 });
            if (events) {
                let transaction = await tronGrid.trx.getUnconfirmedTransactionInfo(events[0].transaction);
                console.log(transaction)
                if (transaction.receipt.result == "SUCCESS") {
                    await db.query(`INSERT INTO transactions (user_id, wallet_address, to_wallet, type, tron_amount, token_amount) VALUES ( 0 ,'${owner}', '${transferAddress}', 'Transfer Tokens', 0, ${transferToken})`);
                    res.status(200).send({ success: true, msg: 'Successfully transfer the tokens', data: {}, errors: '' });
                } else {
                    res.status(200).send({ success: false, msg: 'Something went wrong', data: {}, errors: '' });
                }
            }
            else {
                res.status(200).send({ success: false, msg: 'Error while transfer the tokens', data: {}, errors: '' });
            }
        } else {
            res.status(200).send({ success: false, msg: 'Not enough balance', data: {}, errors: '' });

        }
    } catch (err) {
        res.status(500).send({ success: false, msg: 'Error while transfer the tokens', data: {}, errors: '' });

    }
}


exports.getPause = async (req, res) => {
    try {
        let instance = await tronGrid.contract().at(contractaddress);
        let paused = await instance.methods.paused().call();
        console.log(paused);
        let soldTokens = await db.query(`select sum(token_amt) As sum  from invest`);
        res.status(200).send({ success: true, msg: 'Pause Details', data: paused, soldToken: soldTokens, errors: '' });
    } catch (err) {
        res.status(500).send({ success: false, msg: 'No details found', data: {}, errors: '' });
    }
}

exports.allTransactions = async (req, res) => {
    try {
        let sql = await db.query(`SELECT * FROM transactions`);
        if (sql.length) {
            let instance = await tronGrid.contract().at(contractaddress);
            let getLockTime = await instance.methods.getLockTime().call();
            let get_lock_stamp = (tronGrid.toDecimal((getLockTime._hex))) * 1000;

            res.status(200).send({ success: true, msg: 'Fetch Transaction History', data: sql, lockTime: get_lock_stamp, errors: '' });
        } else {
            res.status(200).send({ success: false, msg: 'No Transaction History', data: {}, errors: '' });
        }
    } catch (err) {
        res.status(500).send({ success: false, msg: 'No Transaction History', data: {}, errors: '' });
    }
}

exports.phone_otp = async (req, res) => {
    try {

        let phone = 'req.body.phone';
        if (phone != '' && phone != null) {
            let phone_check = await db.query("SELECT * FROM users WHERE phoneNumber = " + db.pool.escape(phone));
            if (!phone_check.length) {
                console.log('working')
                let OTP = Math.floor((Math.random() * 100000) + 1);
                const client = require('twilio')(accountSid, authToken);
                client.messages

                    .create({
                        body: 'OTP: ' + OTP,
                        from: process.env.from,
                        to: '+918949470347'
                    })
                    .then(message => console.log(message.sid))
                    .done();
                res.status(200).send({ success: true, otp: OTP });
            } else {
                res.status(200).send({ success: false, msg: 'phone is already registered', data: {}, errors: '' });
            }
        } else {
            res.status(200).send({ success: false, msg: 'Please enter a valid phone number', data: {}, errors: '' });
        }
    } catch (err) {
        console.log('in email_otp function error');
        console.log(err);
        res.status(500).send({ success: false, msg: 'Error', data: {}, errors: err });
    }
};

exports.updateNumber = async (req, res) => {
    try {
        let userID = req.body.userID;
        let phoneNumber = req.body.phone;
        console.log(userID, phoneNumber);

        console.log(typeof (userID));
        let id_check = await db.query(`SELECT * FROM users WHERE id = ${userID}`);
        var err = id_check;

        if (id_check.length) {
            let sql = await db.query(`UPDATE users SET phoneNumber = '${phoneNumber}' WHERE id = ${userID}`);
            if (sql) {
                res.status(200).send({ success: true, msg: 'phone Number updated', data: '', errors: '' });
            } else {
                res.status(201).send({ success: true, msg: 'There is some problem while updating your number please try again letter', data: '', errors: '' });
            }

        } else {

            res.status(202).send({ success: false, msg: 'User does not exist.', data: {}, errors: '' });
        }
    } catch (err) {
        console.log('Error in update');
        console.log(err);
        res.status(500).send({ success: false, msg: 'Error', data: {}, errors: err });
    }

};

exports.balanceOf = async (req, res) => {
    // try {
    let address = req.query.address;
    let rewardAddress = req.query.rewardAddress;
    let instance = await tronGrid.contract().at(token_address);
    let owner = await instance.owner().call();
    let List = [];
    let data = [];
    List.push(address, rewardAddress, owner);

    for (let i = 0; i < List.length; i++) {
        let setPrice = await instance.balanceOf(List[i]).call();
        setPrice = await tronGrid.toDecimal(setPrice);
        data.push(setPrice);
    }
    console.log("setPricesetPricesetPricesetPricesetPricesetPricesetPricesetPrice", data);
    res.status(200).send({ success: true, msg: 'Successfully transfer the tokens', data: data, errors: '' });
    //     }
    //  catch (err) {
    //     res.status(500).send({ success: false, msg: 'Error while transfer the tokens', data: {}, errors: '' });
    // }
}