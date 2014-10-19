var _ = require('underscore');
var http = require('http');
var bitcoin = require('bitcoin');
var schedule = require('node-schedule');
var addr_validator = require('validator');
var posix = require('posix');
posix.setrlimit('nofile', { soft: 10000, hard: 10000 });

var bit = new bitcoin.Client({
    host: '127.0.0.1',
    port: 25661,
    user: 'rpcuser',
    pass: 'rpcpass'
})

var config = {
    amount: 5000,
    logging: true
}

function log(data) {
    if (config.logging)
        console.log(new Date() + " " + data);
}

var list = {};
var wallets = [];

console.log(new Date());

schedule.scheduleJob({minute: 0}, function () {
    console.log('Start to make payments');
    console.log('Number of IP addresses - ' + _.keys(list).length);
    console.log('Number of coin addresses - ' + wallets.length);

    if (!wallets.length) return;

    var summ = config.amount / wallets.length;

    var obj = {}
    _.each(wallets, function (wallet) {
        obj[wallet] = summ
    })

    bit.sendMany('', obj, function (error) {
        log(arguments);
    })

    list = {}
    wallets = [];
})

var server = http.createServer(function (req, res) {

    checkUrl();

    function checkUrl() {
        var ip = req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;

        var s = req.url.split('/miraclecoin/get/');
        if (s.length == 2 && addr_validator.check(s[1])) {
            var lan = ip.split('.').slice(0, -1).join('.');
            if (!list[lan]) {
                list[lan] = true;
                if (!(_.contains(wallets, s[1]))) {
                    wallets.push(s[1]);
                    log("Coin address " + s[1] + " added with IP " + ip);
                    msg = 'Your coin address ' + s[1] + ' added to the list';
                } else {
                    log("We already have coin address " + s[1] + ", IP: " + ip);
                    msg = "We already have this coin address in our list";
                }
            } else {
                log("Duplicate request from IP " + ip);
                msg = 'Your IP temporarily blocked: ' + ip;
            }
            res.write(msg);
            res.end();
        } else {
            res.write('wrong request');
            res.end();
        }
    }

})

server.listen(666);

