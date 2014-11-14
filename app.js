var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cheerio = require('cheerio');
var http = require('http');
var request = require('request');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//request.post({url:'http://service.com/upload', form: {key:'value'}}, function(err,httpResponse,body){ /* ... */ })

var wu = {
    login: "https://wu.wsiz.rzeszow.pl/wunet/Logowanie2.aspx",
    podzgodzin: "https://wu.wsiz.rzeszow.pl/wunet/PodzGodzin.aspx",
    oceny: "https://wu.wsiz.rzeszow.pl/wunet/OcenyP.aspx",
    uwagi: "https://wu.wsiz.rzeszow.pl/wunet/UwagiDecyzje.aspx",
    wplaty: "https://wu.wsiz.rzeszow.pl/wunet/Wplaty2.aspx"
};

app.route('/')
.get(function(req, res){
        res.render("login");
})
.post(function(req, res) {
    var user = req.body;
    var viewstate_val, login_name, login_value = "w"+user.login, password_name, password_value = user.password, submit_name, submit_value;
        // parse login form
        request('https://wu.wsiz.rzeszow.pl/wunet/Logowanie2.aspx', function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var $ = cheerio.load(body);
                viewstate_val = $('#__VIEWSTATE').val();
                login_name = $('.login_field').find("input[type=text]").attr("name");
                password_name = $('.login_field').find("input[type=password]").attr("name");
                submit_name = $('.login_button').find("input[type=submit]").attr("name");
                submit_value = $('.login_button').find("input[type=submit]").val();

                var formData = {
                    __VIEWSTATE: viewstate_val
                };
                formData[login_name] = login_value;
                formData[password_name] = password_value;
                formData[submit_name] = submit_value;


                console.log(formData);

                request.post({url:'https://wu.wsiz.rzeszow.pl/wunet/Logowanie2.aspx', jar: true, form: formData}, function optionalCallback(err, httpResponse, body) {
                    if (err) {
                        return console.error('upload failed:', err);
                    } else {
                        console.log();
                        var status = httpResponse.statusCode;
                        if(status==302) {
                            //console.log("redirect");
                            res.redirect("/podzialgodzin");
                        } else {
                            return res.render("login", {error: "Auth error"});
                        }
                    }
                });
            } else {
                res.redirect("/#someproblems");
            }
        });
});

app.get("/podzialgodzin", function(req, res) {
    return request({url: wu.podzgodzin, jar:true}, function(err, httpResponse, body) {
        var path = httpResponse.request.uri.pathname;
        if(path == "/wunet/Logowanie2.aspx") {
            res.redirect("/");
        } else {
            var $ = cheerio.load(body);
            $("#ctl00_ctl00_ContentPlaceHolder_RightContentPlaceHolder_dgDane").find(".opisPrzedmDyd").remove();
            var data = $("#ctl00_ctl00_ContentPlaceHolder_RightContentPlaceHolder_dgDane");
            return res.render("podzialgodzin", {
                data: data
            });
        }

    });
});

module.exports = app;
