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
        link STRING PRIMARY KEY,
        id int,
        uses int
    );`
    db.run(query)
}

// createTableUsers()
// createTableLinks()

function addUser(id) {
    const query = `INSERT INTO Users(id, points, status) VALUES (?, 100, "standart")`
    db.run(query, [id])
}

function getUser(id, callback){
    const query = `SELECT points, status FROM Users WHERE id = ${id}`
    db.get(query, (err, res) => {
        callback(res)
    })
}

function updatePoints(id,action){
    const query = `UPDATE Users SET points `+action+` WHERE id = ${id}`
    db.run(query,(err,res)=>{
        console.log(err)
    })
} 

function addLink(id,link){
    const query = `INSERT INTO Links(id,link,uses) VALUES(?,?,0)`
    db.run(query, [id, link])
}

function getUsersLinks(id, callback){
    const query = `SELECT link, uses FROM Links WHERE id = ${id}`
    db.all(query, (err, res) => {
        console.log(err)
        callback(res)
    })
}

function getLinks(callback){
    const query = `SELECT link FROM Links`
    db.all(query, (err, res) => {
        console.log(err)
        callback(res)
    })
}

function addUses(link){
    const query = `UPDATE Links SET uses = uses + 1 WHERE link = ${link}`
    db.run(query,(err)=>{
        console.log(err)
    })
}

function getRandomLink(callback){
    const query = `SELECT link FROM Links`
    db.all(query,(err,res)=>{
        const index = Math.floor(Math.random()*res.length)
        const randomLink = res[index]
        callback(randomLink)
    })
}

function changeStatus(id,status){
    const query = `UPDATE Users SET status = '${status}' WHERE id = ${id}`
    db.run(query,(err)=>{
        console.log(err)
    })
}

function getUserByLink(link,callback){
    const query = `SELECT id FROM Links WHERE link = '${link}'`
    db.get(query,(err,res)=>{
        console.log(err)
        callback(res)
    })
    
}

bot.start((ctx)=>{
    getUser(ctx.from.id, (res) => {
        if (res){
            ctx.reply('Привіт я бот який ТОЧНО не бустить тобі підписників', Markup.keyboard([
                Markup.button.callback('Отримати бали (1 бал за 1 підписку)'), 
                Markup.button.callback('Отримати інформацію про аккаунт'),
                Markup.button.callback('Додати свою ссилку')
            ]).resize())
        } else {
            addUser(ctx.from.id)
            ctx.reply("Привіт я бот який ТОЧНО не бустить тобі підписників", Markup.keyboard([
                Markup.button.callback('Отримати бали (1 бал за 1 підписку)'), 
                Markup.button.callback('Отримати інформацію про аккаунт'),
                Markup.button.callback('Додати свою ссилку')
            ]).resize())  
        }

    })
})

bot.hears("Отримати інформацію про аккаунт", (ctx) => {
    console.log("GETINFO!")
    getUser(ctx.from.id, (res1) => {
        if(res1){
            let replyMessage = ''

            getUsersLinks(ctx.from.id,(res)=>{
                
                for(let link of res){
                   replyMessage+="\n"+link.link+"\nКількість використань "+link.uses
                }
                const callback = () => {ctx.reply(`Кількість балів: ${res1.points}`+replyMessage,Markup.keyboard([
                    Markup.button.callback('Отримати бали (1 бал за 1 підписку)'), 
                    Markup.button.callback('Отримати інформацію про аккаунт'),
                    Markup.button.callback('Додати свою ссилку')
                ])
                )}
                callback()
            })
        }
    })
})

bot.hears('Отримати бали (1 бал за 1 підписку)',(ctx)=>{
    getUser(ctx.from.id,(res1)=>{
        if (res1){
            getRandomLink((res)=>{
                ctx.reply(`${res.link}`,  Markup.inlineKeyboard([Markup.button.callback('Перевірити підписку','check')]))
                bot.action('check', (ctx) => {
                    const check = bot.telegram.getChatMember(res.link,ctx.from.id)
                    if(check){
                        addUses(res.link)
                        updatePoints(ctx.from.id,'= points + 1')
                        getUserByLink(res.link,(res1)=>{
                            updatePoints(res1.id,'= points - 1')
                            ctx.reply("Успіх! Вам нараховано 1 бал")
                        })
                    } else {
                        ctx.reply("Перевірте підписку на канал.")
                    }
                })
            })
        }
    })
}) 

bot.hears('Додати свою ссилку', (ctx) => {
    getUser(ctx.from.id,(res)=>{
        if (res){
            console.log(res.status+"HEAR")
            if (res.status == 'standart'){
                changeStatus(ctx.from.id, 'addLink')
                ctx.reply('Напишіть вашу ссилку')
            }
        }
    })
})

bot.on("text",(ctx) => {
    getUser(ctx.from.id, (res) =>{
        if(res){
            console.log(res.status+"ON")
            if(res.status == "addLink"){
                getLinks((res)=>{
                    let isNot = 0
                    for(let link of res){
                        if (link.link == ctx.message.text){
                            isNot ++
                        }
                    }
                    const callback = ()=>{ if(isNot >= 1){
                        ctx.reply("Це посилання вже було додано. Будь ласка напишить інше посилання")
                    } else {
                        addLink(ctx.from.id, ctx.message.text)
                        ctx.reply('Ваша ссилка була додана')
                        changeStatus(ctx.from.id, 'standart')
                    }}
                    callback()
                })
            }
        }
    })
})


bot.launch()

// https://t.me/advertasingWITSTUDENTSbot 