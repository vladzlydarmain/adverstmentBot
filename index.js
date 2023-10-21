const { Telegraf } = require('telegraf')
const sqlite3 = require('sqlite3').verbose()
const { Markup } = require('telegraf')

const db = new sqlite3.Database('db.sqlite3')   

const bot = new Telegraf("")

function createTableUsers(){
    const query = `CREATE TABLE Users (
        id INTEGER PRIMARY KEY,
        points int,
        status varchar(255)
    );`
    db.run(query)
}

function createTableLinks(){
    const query = `CREATE TABLE Links (
        id int,
        link str,
        uses int
    );`
    db.run(query)
}

createTableUsers()
createTableLinks()

function addUser(id) {
    const query = `INSERT INTO Users(id, points, status) VALUES (?, 100, "standart")`
    db.run(query, [id])
}

function getUser(id, callback){
    const query = `SELECT points, links FROM Users WHERE id = ${id}`
    db.get(query, (err, res) => {
        callback(res)
    })
}

function updatePoints(id, points){
    const query = `UPDATE Users SET points = '${points}' WHERE id = ${id}`
    db.run(query)
}

function updateLinks(id,link){
    const query = `INSERT INTO Links(id,link) VALUES(?,?)`
    db.run(query, [id, link])
}

function getrandomLink(){
    const query = `SELECT link FROM Links`
    db.all(query,(err,res)=>{
        const index = Math.floor(Math.random()*res.length)
        const randomLink = res[index]
    })
}

bot.start((ctx)=>{
    getUser(ctx.from.id, (res) => {
        if (res){
            ctx.reply('Привіт я бот який ТОЧНО не бустить тобі підписників', Markup.keyboard([
                Markup.button('Отримати бали (1 бал за 1 підписку)', 'getPoints'), 
                Markup.button('Отримати інформацію про аккаунт', 'getInfo'),
                Markup.button('Додати свою ссилку', 'addLink')
            ]))
        } else {
            addUser(ctx.from.id)
            ctx.reply("Привіт я бот який ТОЧНО не бустить тобі підписників", Markup.keyboard([
                Markup.button('Отримати бали (1 бал за 1 підписку)', 'getPoints'), 
                Markup.button('Отримати інформацію про аккаунт', 'getInfo'),
                Markup.button('Додати свою ссилку', 'addLink')
            ]))
        }

    })
})

bot.action('getInfo', (ctx) => {
    getUser(ctx.from.id,(res)=>{
        const replyMessage = ''
        for (link of res.links){
            replyMessage+=`\n${link}`
        }
        ctx.reply(`Кількість балів: ${res.points}`+replyMessage,Markup.keyboard([
            Markup.button('Отримати бали (1 бал за 1 підписку)', 'getPoints'), 
            Markup.button('Отримати інформацію про аккаунт', 'getInfo'),
            Markup.button('Додати свою ссилку', 'addLink')
        ]))
    })
})

bot.action('addLink', (ctx) => {
    getUser(ctx.from.user,(res)=>{
        if (res) {
            
        }
    })
})

bot.on("text",(ctx) => {
    getUser(ctx.from.id, (res) =>{
        if(res){

        }
    })
})


bot.launch()
// https://t.me/advertasingWITSTUDENTSbot