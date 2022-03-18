const db = require('./db');
const send_email = require('./email');

exports.otp_gen = async (data) => {
    try {
        if (data != "" && data != null) {
            let user_id = '';
            let email = '';
            let tx_id = '';
            let msg = '';
            let name ='';
            if (data['user_id'] != '' && data['user_id'] != null) user_id = data['user_id'];
            if (data['email'] != '' && data['email'] != null) email = data['email'];
            if (data['tx_id'] != '' && data['tx_id'] != null) tx_id = data['tx_id'];
            if (data['msg'] != '' && data['msg'] != null) msg = data['msg'];
            if (user_id != '' || email != '') {
                let otp = Math.floor(Math.random() * 8999) + 1000;
                console.log(otp, "otppppppp");
                if (user_id != '') {
                    let user = await db.query("SELECT * FROM `users` WHERE `id` = " + db.pool.escape(user_id));
                    if (user.length) {
                        if (email == '') email = user[0].email;
                        name = user[0].username;
                    }
                } else {
                    name = email;
                    user_id = 0;
                }
                await db.query("DELETE FROM `otp` WHERE `otp`.`user_id` = '" + user_id + "' AND `otp`.`email` = '" + email + "' AND `otp`.`tx_id` = '" + tx_id + "';");
                let insert_otp = await db.query("INSERT INTO `otp` (`user_id`, `email`, `tx_id`, `otp`, `otp_status`, `msg`) VALUES ('" + user_id + "', '" + email + "', '" + tx_id + "', '" + otp + "', '0', '" + msg + "');");
                if (insert_otp) {
                    console.log("mymail", email)
                    let res = await send_email.otp_gen(email, otp, name, msg);
                    return { success: true, msg: 'An OTP sent to you email successfully.', data: data, otp: otp, errors: '' };
                } else {
                    return { success: false, msg: 'A problem occured while sending mail error 1.', data: data, errors: '' };
                }
            } else {
                console.log("No user_id or email_id in data object.");
                return false;
            }
        } else {
            console.log("No data recived.");
            return false;
        }
    } catch (err) {
        console.log('in email_otp_gen function error');
        console.log(err);
        return { success: false, msg: 'Error', data: '', errors: err };
    }
};
exports.otp_gen_phone = async (data) => {
    try {
        if (data != "" && data != null) {
            let user_id = '';
            let phone = '';
            let tx_id = '';
            let msg = '';
            let toaddress = '';
            if (data['user_id'] != '' && data['user_id'] != null) user_id = data['user_id'];
            if (data['user'] != '' && data['user'] != null) phone = data['user'];
            if (data['tx_id'] != '' && data['tx_id'] != null) tx_id = data['tx_id'];
            if (data['msg'] != '' && data['msg'] != null) msg = data['msg'];
            if (user_id != '' || phone != '') {
                let otp = Math.floor(Math.random() * 8999) + 1000;
                if (user_id != '') {
                    let user = await db.query("SELECT * FROM `users` WHERE `id` = " + db.pool.escape(user_id));
                    if (user.length) {
                        if (phone == '') phone = user[0].phoneNumber;
                        console.log(phone);
                        name = user[0].username;
                    }
                } else {
                    name = phone;
                    user_id = 0;
                }
                await db.query("DELETE FROM `otp` WHERE `otp`.`user_id` = '" + user_id + "' AND `otp`.`email` = '" + phone + "' AND `otp`.`tx_id` = '" + tx_id + "';");
                let insert_otp = await db.query("INSERT INTO `otp` (`user_id`, `email`, `tx_id`, `otp`, `otp_status`, `msg`) VALUES ('" + user_id + "', '" + phone + "', '" + tx_id + "', '" + otp + "', '0', '" + msg + "');");
                if (insert_otp) {
                    const accountSid = 'AC4529c03942ec32671319e73cd67d5901';
                    const authToken = 'ec00b1494d03bb057abd6a83ee6aa016';
                    const client = require('twilio')(accountSid, authToken);
                    client.messages
                        .create({
                            body: 'OTP ' + otp,
                            from: '+12073868752',
                            to: '+918949470347'
                        })
                        .then(message => console.log(message.sid))
                        .done();

                    return { success: true, msg: 'An OTP sent to you email successfully.', data: data, errors: '' };
                } else {
                    return { success: false, msg: 'A problem occured while sending mail error 1.', data: data, errors: '' };
                }
            } else {
                console.log("No user_id or email_id in data object.");
                return false;
            }
        } else {
            console.log("No data recived.");
            return false;
        }
    } catch (err) {
        console.log('in email_otp_gen function error');
        console.log(err);
        return { success: false, msg: 'Error', data: '', errors: err };
    }
};

exports.otp_verify = async (data) => {
    try {
        if (data != "" && data != null) {
            console.log("in 2", data);
            let user_id = '';
            let email = '';
            let tx_id = '';
            let msg = '';
            let name = '';
            let otp = '';
            let phone = '';
            let type = '';
            otp = data['otp'];
            if (otp == '' || otp == null) {
                console.log("No OTP in data object.");
                return false;
            }
            if (data['user_id'] != '' && data['user_id'] != null) user_id = data['user_id'];
            if (data['email'] != '' && data['email'] != null) email = data['email'];
            if (data['tx_id'] != '' && data['tx_id'] != null) tx_id = data['tx_id'];
            if (data['phone'] != '' && data['phone'] != null) phone = data['phone'];
            if (data['msg'] != '' && data['msg'] != null) msg = data['msg'];
            if (data['type'] != '' && data['type'] != null) { type = data['type']; } else { type = 'email' }
            if (user_id != '' || email != '') {
                if (user_id != '') {
                    let user = await db.query("SELECT * FROM `users` WHERE `id` = " + db.pool.escape(user_id));
                    if (user.length) {
                        if (email == '') email = user[0].email;
                        name = user[0].username;
                    }
                } else {
                    name = email;
                    user_id = 0;
                }
                console.log(user_id);
                console.log(email);
                console.log(phone);
                console.log(type);
                if (type == 'mobile') {
                    var get_otp = await db.query("SELECT * FROM `otp` WHERE `user_id` = '" + user_id + "' AND `email` = '" + phone + "' AND `tx_id` = '" + tx_id + "'");
                } else if (type == 'email') {
                    var get_otp = await db.query("SELECT * FROM `otp` WHERE `user_id` = '" + user_id + "' AND `email` = '" + email + "' AND `tx_id` = '" + tx_id + "'");
                }

                console.log("in 3 ", get_otp);
                if (get_otp.length) {
                    if (get_otp[0].otp_status < 3) {
                        console.log('getotp', get_otp[0].otp);
                        if (get_otp[0].otp == otp) {
                            let res = (await send_email.otp_verifyed(email, name, msg, tx_id))
                            // if (res) {
                                // await db.query("DELETE FROM `otp` WHERE `otp`.`user_id` = '" + user_id + "' AND `otp`.`email` = '" + email + "' AND `otp`.`tx_id` = '" + tx_id + "';");
                                return { success: true, msg: 'OTP verifyed and verification email sent successfully.', data: get_otp[0], errors: '' };
                            // } else {
                            //     return { success: false, msg: 'A problem occured while sending mail.', data: data, errors: '' };
                            // }
                            //    return { success: false, msg: 'A problem occured while sending mail.', data: data, errors: ''};
                            // }
                        } else {
                            await db.query("UPDATE `otp` SET `otp_status` = `otp_status` + '1' WHERE `otp`.`user_id` = '" + user_id + "' AND `otp`.`email` = '" + email + "' AND `otp`.`tx_id` = '" + tx_id + "';");
                            return { success: false, msg: 'Wrong OTP.', data: data, errors: '' };
                        }
                    } else {
                        await db.query("DELETE FROM `otp` WHERE `otp`.`user_id` = '" + user_id + "' AND `otp`.`email` = '" + email + "' AND `otp`.`tx_id` = '" + tx_id + "';");
                        return { success: false, msg: 'Too many attempts.', data: data, errors: '' };
                    }
                } else {
                    return { success: false, msg: 'No OTP record found.', data: data, errors: '' };
                }
            } else {
                console.log("No user_id or email_id in data object.");
                return false;
            }
        } else {
            console.log("No data recived.");
            return false;
        }
    } catch (err) {
        console.log('in email_otp_verify function error');
        console.log(err);
        return { success: false, msg: 'Error', data: '', errors: err };
    }
};
