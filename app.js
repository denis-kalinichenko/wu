var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var cheerio = require('cheerio');
//var http = require('http');
var request = require('request');
var fs = require("fs");
var mysql = require("mysql");
var io = require('socket.io');
var tough = require('tough-cookie');

// new modules
var stats = require("stats");

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


// global urls array
var wu = {
    login: "https://wu.wsiz.rzeszow.pl/wunet/Logowanie2.aspx",
    podzgodzin: "https://wu.wsiz.rzeszow.pl/wunet/PodzGodzin.aspx",
    oceny: "https://wu.wsiz.rzeszow.pl/wunet/OcenyP.aspx",
    uwagi: "https://wu.wsiz.rzeszow.pl/wunet/UwagiDecyzje.aspx",
    wplaty: "https://wu.wsiz.rzeszow.pl/wunet/Wplaty2.aspx"
};

// global pages array
var page = {
    podzialgodzin: {
        title: "Podział godzin",
        url: "/podzialgodzin"
    },
    oceny: {
        title: "Oceny",
        url: "/oceny"
    },
    uwagi: {
        title: "Uwagi i decyzje",
        url: "/uwagi"
    },
    wplaty: {
        title: "Wpłaty",
        url: "/wplaty"
    }
};

app.route('/')
.get(function(req, res){
        res.render("login");
        stats.init(fs, req.ip);
})
.post(function(req, res) {
    var user = req.body;
    var viewstate_val, login_name, login_value = "w"+user.login, password_name, password_value = user.password, submit_name, submit_value;
        // parse login form
        request(wu.login, function (error, response, body) {
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

                var j = request.jar();
                request.post({url:'https://wu.wsiz.rzeszow.pl/wunet/Logowanie2.aspx', form: formData, jar: j}, function optionalCallback(err, httpResponse, body) {
                    console.log(j);
                    if (err) {
                        return console.error('login failed:', err);
                    } else {
                        var status = httpResponse.statusCode;
                        if(status==302) {
                            var path = "/wu/userdata/"+login_value+".txt";
                            fs.exists(path, function(exists) {
                                if (!exists) {
                                    fs.openSync(path, 'w');
                                }
                            });
                            //var cookies  = JSON.stringify(j._jar.store.idx);
                            var cookies = j.getCookieString("https://wu.wsiz.rzeszow.pl/wunet/Logowanie2.aspx");

                            fs.writeFile(path, cookies, function(err) {
                                if(err) {
                                    console.log(err);
                                }
                            });

                            /* set cookie */
                            res.cookie('user', login_value);

                            /* should be ok, redirect */
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

app.get(page.podzialgodzin.url, function(req, res) {
    var path = "/wu/userdata/"+req.cookies.user+".txt";
    //fs.exists(path, function(exists) {
    //    if (!exists) {
    //        return res.redirect("/");
    //    }
    //});
    fs.readFile(path, 'utf8', function (err, data) {
        if (err) {
            console.log('Error: ' + err);
            return;
        }
        var j = request.jar();
        var cookie = request.cookie(data);
        j.setCookie(cookie, "https://wu.wsiz.rzeszow.pl/");
        request({url: wu.podzgodzin, jar: j}, function(err, httpResponse, body) {
            console.log(j);
            var path = httpResponse.request.uri.pathname;
            if(path == "/wunet/Logowanie2.aspx") {
                res.redirect("/#problem");
            } else {
                var $ = cheerio.load(body);
                $("#ctl00_ctl00_ContentPlaceHolder_RightContentPlaceHolder_dgDane").addClass("table table-hover table-responsive").find(".opisPrzedmDyd").remove();
                var data = $("#ctl00_ctl00_ContentPlaceHolder_RightContentPlaceHolder_dgDane");
                return res.render("page", {
                    title: page.podzialgodzin.title,
                    menu: page,
                    data: data
                });
            }
        });
    });


});



module.exports = app;
