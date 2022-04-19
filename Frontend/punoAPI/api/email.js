require('dotenv').config()
const nodemailer = require('nodemailer');


function send_mails(to_mail, subj, htmlBody) {
    let transporter = nodemailer.createTransport({
        host: "smtpout.secureserver.net",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: 'support@puno.finance', // generated ethereal user
            pass: 'Support@puno' // generated ethereal password
        },
        tls: {
            rejectUnauthorized: false
        }
    });
    var mailOptions = {
        from: 'support@puno.finance',
        to: to_mail,
        subject: subj,
        html: htmlBody
    };
    transporter.sendMail(mailOptions, function (error, info) {
        console.log("error",error);
        console.log("inf oooooooo",info);
        return true;

    });
}

exports.otp_gen = async (email, otp, name, msg) => {
    if (email != '' && otp != '') {
        let htmlContent = "<p>Dear " + name + ",</p>";
        if (msg != '') htmlContent = htmlContent + "<p>" + msg + "</p>" + otp;
        return await send_mails(email, "One Time Password", htmlContent);
    } else {
        return false;
    }
};

exports.otp_verifyed = async (email, name, msg, tx_id) => {
    if (email != '') {
        let htmlContent = "<p>Dear " + name + ",</p><p>This email is sent you for the purpose to notify you that an OTP is verified.</p>";
        if (msg != '') htmlContent = htmlContent + "<p>" + msg + "</p>";
        if (tx_id != '') htmlContent = htmlContent + "<h3> Transaction ID : " + tx_id + "</h3>";
        htmlContent = htmlContent + "<br><p>Please contact us if this is not you.</p><br><p>Regards,<br>" + process.env.company_name + " Team<br>" + process.env.mail_from + "</p>";
        return await send_mails(email, "One Time Password Verifyed", htmlContent);
    } else {
        return false;
    }
};
exports.WithdrawEmail = async (email, msg, htmlContent) => {
    if (email != '') {
        console.log(htmlContent)
        return await send_mails(email, msg, htmlContent);
    } else {
        return false;
    }
};

