require('dotenv').config()
const nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
const request = require("request");
const db = require('./db');
const sendgrid = require('@sendgrid/mail');

  function send_mails(to_mail,subj,htmlBody){
   // console.log("2");
    let transporter = nodemailer.createTransport({
        host: "smtpout.secureserver.net",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: 'support@puno.finance', // generated ethereal user
          pass: 'Support@puno' // generated ethereal password
        },
        tls:{
          rejectUnauthorized:false
        }
    });
    var mailOptions = {
        from: 'support@puno.finance',
        to: to_mail,
        subject: subj,
        html: htmlBody
    };
    
    transporter.sendMail(mailOptions, function(error, info){
 //           console.log("4");
            console.log(info);
          return true;
       
    });
}

exports.otp_gen = async (email,otp,name,msg,tx_id) => {
    if(email != '' && otp != ''){
        let htmlContent = "<p>Dear "+name+",</p><p>This email is sent you for the purpose to verify that this is you who doing action on our system.</p>";
        if(msg != '') htmlContent = htmlContent + "<p>" + msg + "</p>";
        if(tx_id != '') htmlContent = htmlContent + "<h3> Transaction ID : " + tx_id + "</h3>";
        htmlContent = htmlContent + "<br><p>Please contect us if not you or verify below OTP.</p><h1>"+otp+"</h1><br><p>Team<br>"+process.env.mail_from+"</p>";
//	console.log("1");
	return await send_mails(email, "One Time Password", htmlContent);
    }else{
        return false;
    }
};

exports.otp_verifyed = async (email,name,msg,tx_id) => {
    if(email != ''){
        let htmlContent = "<p>Dear "+name+",</p><p>This email is sent you for the purpose to notify you that an OTP is verified.</p>";
        if(msg != '') htmlContent = htmlContent + "<p>" + msg + "</p>";
        if(tx_id != '') htmlContent = htmlContent + "<h3> Transaction ID : " + tx_id + "</h3>";
        htmlContent = htmlContent + "<br><p>Please contect us if not you.</p><br><p>Regards,<br>"+process.env.company_name+" Team<br>"+process.env.mail_from+"</p>";
        return await send_mails(email,"One Time Password Verifyed",htmlContent);
    }else{
        return false;
    }
};




// send_mails.catch(console.error);
