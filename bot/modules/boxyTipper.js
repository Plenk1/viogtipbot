/*
Simply find and replace instances below with the coin and symbol you want to use!
search and replace with case sensitivity!!
example:
1. boxy   = ethereum
2. Boxy   = Ethereum
3. boxy        = eth
4. BOXY        = ETH
*/

'use strict';

const bitcoin = require('bitcoin'); //leave as const bitcoin = require('bitcoin');
const Discord = require('discord.js');
let bot = new Discord.Client();

let Regex = require('regex'),
  config = require('config'),
  spamchannels = config.get('moderation').botspamchannels;
let walletConfig = config.get('boxyd');
const boxy = new bitcoin.Client(walletConfig); //leave as = new bitcoin.Client(walletConfig)

exports.commands = ['tipboxy'];
exports.tipboxy = {
  usage: '<subcommand>',
  description:
    '**!tipboxy** : Displays This Message\n    **!tipboxy balance** : get your balance\n    **!tipboxy deposit** : get address for your deposits\n    **!tipboxy withdraw <ADDRESS> <AMOUNT>** : withdraw coins to specified address\n    **!tipboxy <@user> <amount>** :mention a user with @ and then the amount to tip them\n    **!tipboxy private <user> <amount>** : put private before Mentioning a user to tip them privately.',
  process: async function(bot, msg, suffix) {
    let tipper = msg.author.id.replace('!', ''),
      words = msg.content
        .trim()
        .split(' ')
        .filter(function(n) {
          return n !== '';
        }),
      subcommand = words.length >= 2 ? words[1] : 'help',
      helpmsg =
        '**!tipboxy** : Displays This Message\n    **!tipboxy balance** : get your balance\n    **!tipboxy deposit** : get address for your deposits\n    **!tipboxy withdraw <ADDRESS> <AMOUNT>** : withdraw coins to specified address\n    **!tipboxy <@user> <amount>** :mention a user with @ and then the amount to tip them\n    **!tipboxy private <user> <amount>** : put private before Mentioning a user to tip them privately.\n    **<> : Replace with appropriate value.**',
      channelwarning = 'Please use <#bot-spam> or DMs to talk to bots.';
    switch (subcommand) {
      case 'help':
        privateorSpamChannel(msg, channelwarning, doHelp, [helpmsg]);
        break;
      case 'balance':
        doBalance(msg, tipper);
        break;
      case 'deposit':
        privateorSpamChannel(msg, channelwarning, doDeposit, [tipper]);
        break;
      case 'withdraw':
        privateorSpamChannel(msg, channelwarning, doWithdraw, [tipper, words, helpmsg]);
        break;
      case 'rain':
        doRain(bot, msg, tipper, words, helpmsg);
        break;
      default:
        doTip(bot, msg, tipper, words, helpmsg);
    }
  }
};

function privateorSpamChannel(message, wrongchannelmsg, fn, args) {
  if (!inPrivateorSpamChannel(message)) {
    message.reply(wrongchannelmsg);
    return;
  }
  fn.apply(null, [message, ...args]);
}

function doHelp(message, helpmsg) {
  message.author.send(helpmsg);
}

function doBalance(message, tipper) {
  boxy.getBalance(tipper, 1, function(err, balance) {
    if (err) {
      message.reply('Error getting Boxy balance.').then(message => message.delete(10000));
    } else {
      message.reply('You have *' + balance + '* BOXY');
    }
  });
}

function doDeposit(message, tipper) {
  getAddress(tipper, function(err, address) {
    if (err) {
      message.reply('Error getting your Boxy deposit address.').then(message => message.delete(10000));
    } else {
      message.reply('Your Boxy (BOXY) address is ' + address);
    }
  });
}

function doWithdraw(message, tipper, words, helpmsg) {
  if (words.length < 4) {
    doHelp(message, helpmsg);
    return;
  }

  var address = words[2],
    amount = getValidatedAmount(words[3]);

  if (amount === null) {
    message.reply("I don't know how to withdraw that many Boxy coins...").then(message => message.delete(10000));
    return;
  }

  boxy.sendFrom(tipper, address, Number(amount), function(err, txId) {
    if (err) {
      message.reply(err.message).then(message => message.delete(10000));
    } else {
      message.reply('You withdrew ' + amount + ' BOXY to ' + address + '\n' + txLink(txId) + '\n');
    }
  });
}

function doTip(bot, message, tipper, words, helpmsg) {
  if (words.length < 3 || !words) {
    doHelp(message, helpmsg);
    return;
  }
  var prv = false;
  var amountOffset = 2;
  if (words.length >= 4 && words[1] === 'private') {
    prv = true;
    amountOffset = 3;
  }

  let amount = getValidatedAmount(words[amountOffset]);

  if (amount === null) {
    message.reply("I don't know how to tip that many Boxy coins...").then(message => message.delete(10000));
    return;
  }
  if (!message.mentions.users.first()){
       message
        .reply('Sorry, I could not find a user in your tip...')
        .then(message => message.delete(10000));
        return;
      }
  if (message.mentions.users.first().id) {
    sendBOXY(bot, message, tipper, message.mentions.users.first().id.replace('!', ''), amount, prv);
  } else {
    message.reply('Sorry, I could not find a user in your tip...').then(message => message.delete(10000));
  }
}

function doRain(bot, message, tipper, words, helpmsg) {
  if (words.length < 3 || !words) {
      doHelp(message, helpmsg);
      return;
  }
  var prv = false;
  var amountOffset = 2;
  if (words.length >= 4 && words[1] === 'private') {
      prv = true;
      amountOffset = 3;
  }

  let amount = getValidatedAmount(words[amountOffset]);

  if (amount === null) {
    message.reply("I don't know how to tip that many Boxy coins...").then(message => message.delete(10000));
    return;
  } else if (amount < 0.01){
    message.reply("Atleast 0.01 BOXY is required to rain").then(message => message.delete(10000));
    return;
  }

  boxy.getBalance(tipper, function(err, balance){
    if(amount < balance){
      let members = bot.users;
      let online = members.filter(m => m.presence.status === 'online' && m.bot === false && tipper !== m.id);
      let onlineID = online.map(function (user) {
        return user.id;
      });
      let shareAmount = amount/onlineID.length;
      if(!onlineID.length){
          message.reply(onlineID.length + " users currently online. No BOXY is rained");
      } else {
        onlineID.forEach(function(id){
          getAddress(id, function(err, address) {
            if (err) {
              message.reply(err.message).then(message => message.delete(10000));
            } else {
              boxy.sendFrom(tipper, address, Number(shareAmount), 1, null, null, function (err, txId) {
                if(err) console.log(err + " with address " + address);
                else console.log(shareAmount + " tipped from " + tipper + " to " + address + " with txid: " + txId);
              })
            }
          })
        });
        message.reply(onlineID.length + " users currently online you sent " + shareAmount + " BOXY to each");
      }
    } else {
      message.reply("Account has insufficient funds").then(message => message.delete(10000));
    }
  });
}

function sendBOXY(bot, message, tipper, recipient, amount, privacyFlag) {
  getAddress(recipient.toString(), function(err, address) {
    if (err) {
      message.reply(err.message).then(message => message.delete(10000));
    } else {
      boxy.sendFrom(tipper, address, Number(amount), 1, null, null, function(err, txId) {
        if (err) {
          message.reply(err.message).then(message => message.delete(10000));
        } else {
          if (privacyFlag) {
            let userProfile = message.guild.members.find('id', recipient);
            var iimessage =
              ' You got privately tipped ' +
              amount +
              ' BOXY\n' +
              txLink(txId) +
              '\n' +
              'DM me `!tipboxy` for boxyTipper instructions.';
            userProfile.user.send(iimessage);
            var imessage =
              ' You privately tipped ' +
              userProfile.user.username +
              ' ' +
              amount +
              ' BOXY\n' +
              txLink(txId) +
              '\n' +
              'DM me `!tipboxy` for boxyTipper instructions.';
            message.author.send(imessage);

            if (
              message.content.startsWith('!tipboxy private ')
            ) {
              message.delete(1000); //Supposed to delete message
            }
          } else {
            var iiimessage =
              ' tipped <@' +
              recipient +
              '> ' +
              amount +
              ' BOXY\n' +
              txLink(txId) +
              '\n' +
              'DM me `!tipboxy` for boxyTipper instructions.';
              message.reply(iiimessage);
          }
        }
      });
    }
  });
}

function getAddress(userId, cb) {
  boxy.getAddressesByAccount(userId, function(err, addresses) {
    if (err) {
      cb(err);
    } else if (addresses.length > 0) {
      cb(null, addresses[0]);
    } else {
      boxy.getNewAddress(userId, function(err, address) {
        if (err) {
          cb(err);
        } else {
          cb(null, address);
        }
      });
    }
  });
}

function inPrivateorSpamChannel(msg) {
  if (msg.channel.type == 'dm' || isSpam(msg)) {
    return true;
  } else {
    return false;
  }
}

function isSpam(msg) {
  return spamchannels.includes(msg.channel.id);
};


function getValidatedAmount(amount) {
  amount = amount.trim();
  if (amount.toLowerCase().endsWith('boxy')) {
    amount = amount.substring(0, amount.length - 3);
  }
  return amount.match(/^[0-9]+(\.[0-9]+)?$/) ? amount : null;
}

function txLink(txId) {
  return 'https://boxy.blockxplorer.info/tx/' + txId;
}


