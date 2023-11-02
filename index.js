require('dotenv').config()

const telegramToken = process.env.TELEGRAM_BOT_TOKEN

const dbName = process.env.DB_NAME

const { Telegraf } = require('telegraf')
const sqlite3 = require('sqlite3').verbose()
const { Markup } = require('telegraf')

const db = new sqlite3.Database(dbName)   

const bot = new Telegraf(telegramToken)

function createTableUsers(){
    const query = `CREATE TABLE Users (
        id INTEGER PRIMARY KEY,
        points int
    );`
    db.run(query)
}

function createTableLinks(){
    const query = `CREATE TABLE Links (
        link STRING PRIMARY KEY,
        id int,
        chat_id int,
        uses int
    );`
    db.run(query)
}

function createTableChannels(){
    const query = `CREATE TABLE Channels (
        link STRING PRIMARY KEY,
        id int,
        chat_id int
    )`
    db.run(query)
}

// createTableUsers()
// createTableLinks() 
// createTableChannels()

function addUser(id) {
    const query = `INSERT INTO Users(id, points) VALUES (?, 100)`
    db.run(query, [id])
}

function getUser(id, callback){
    const query = `SELECT points FROM Users WHERE id = ${id}`
    db.get(query, (err, res) => {
        callback(res)
    })
}

function updatePoints(id,action){
    const query = `UPDATE Users SET points = points ${action} WHERE id = ${id}`
    db.run(query,(err,res)=>{
        // console.log(err)
    })
} 

function addLink(id,link,chat_id){
    const query = `INSERT INTO Links(id,link,chat_id,uses) VALUES(?,?,?,0)`
    db.run(query, [id,link,chat_id],(err)=>{
        // console.log(err)
    })
}

function getUsersLinks(id, callback){
    const query = `SELECT link, uses FROM Links WHERE id = ${id}`
    db.all(query, (err, res) => {
        // console.log(err)
        callback(res)
    })
}

function addUses(link){
    const query = `UPDATE Links SET uses = uses + 1 WHERE link = '${link}'`
    db.run(query,(err)=>{
        // console.log(err)
    })
}

function getLink(link,callback){
    const query = `SELECT id, chat_id, uses FROM Links WHERE link = '${link}'`
    db.get(query, (err, res) => {
        callback(res)
    })
}

function getRandomLink(id,callback,checks = 0){
    const query = `SELECT link,chat_id,uses FROM Links`
    console.log(checks)
    db.all(query,(err,res)=>{
        if (res){
            const index = Math.floor(Math.random()*res.length)
            // console.log(res)
            const randomLink = res[index]
            bot.telegram.getChatMember(randomLink.chat_id, id).then((value)=>{
                if(value.status == "member" || value.status == "administrator" || value.status == "creator"){
                    if(checks >= 20){
                        callback("None")
                    } else {
                        getRandomLink(id,callback,checks+=1)
                    }
                } else {
                    callback(randomLink) 
                }
            })
             
        }
    })
} 

function addUsersNotAddedLinks(id,chat_id){
    const query = `INSERT INTO Channels(link,id,chat_id) VALUES(?,?,?)`
    const link = bot.telegram.createChatInviteLink(chat_id,{expire_date:0})
    
    link.then((value)=>{
        db.run(query,[value.invite_link,id,chat_id])
    })
     
}  

function getNotAddedLinks(callback){
    const query = `SELECT link, chat_id FROM Channels`
    db.all(query,(err,rows)=>{
        callback(rows)
    })
}

function migrateNotAddedLink(link,id,chat_id){
    const query = `DELETE FROM Channels WHERE link = '${link}'`
    db.run(query,(err)=>{
        // console.log(err)
    })
    addLink(id,link,chat_id)
}

function getUsersNotAddedLinks(id,callback){
    const query = `SELECT link,id,chat_id FROM Channels WHERE id = ${id}`
    db.all(query,(err,rows)=>{
        callback(rows)
    }) 
}

function deleteLink(link){
    const query = `DELETE FROM Links WHERE link = '${link}'`
    db.run(query)
}

bot.start((ctx)=>{
    getUser(ctx.from.id, (res) => {
        if (!res){
            addUser(ctx.from.id)  
        }
        ctx.reply("Привіт я бот який ТОЧНО не бустить тобі підписників", Markup.keyboard([
            Markup.button.callback('Отримати бали (1 бал за 1 підписку)'), 
            Markup.button.callback('Отримати інформацію про аккаунт'),
            Markup.button.callback('Додати свою ссилку')
        ]).resize())
    })
})

bot.on("channel_post",(ctx)=>{
    bot.telegram.getChatAdministrators(ctx.chat.id).then((value)=>{
        for(users of value){
            getUser(users.user.id,async (res1)=>{
                if (res1){
                    if (!users.user.is_bot){
                        await new Promise(()=>{getNotAddedLinks(async (res)=>{
                            if(res){
                                // console.log(res)
                                let isNot = 0
                                for(link of res){
                                    if(link.chat_id == ctx.chat.id){
                                        isNot ++
                                    }
                                }
                                
                                if(isNot < 1){
                                    await new Promise(()=>{
                                        addUsersNotAddedLinks(users.user.id,ctx.chat.id)
                                        ctx.reply("Канал зареєстровано")
                                    })
                                    
                                }
                            }
                        })})
                    }
                }
            })
        }
    })
})

bot.hears("Отримати інформацію про аккаунт", (ctx) => {
    getUser(ctx.from.id, (res1) => {
        if(res1){
            let replyMessage = ''
            getUsersLinks(ctx.from.id,(res)=>{
                
                for(let link of res){
                   replyMessage+="\n"+link.link+"\nКількість використань "+link.uses+"/100"
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
            getRandomLink(ctx.from.id,(res)=>{
                if (res != "None"){
                    ctx.reply(`${res.link}`,  Markup.inlineKeyboard([Markup.button.callback('Перевірити підписку','check')]))
                    bot.action('check', (ctx) => {
                        // console.log(ctx.from.id)
                        // console.log(res.chat_id)
                        const check = bot.telegram.getChatMember(res.chat_id,ctx.from.id)

                        check.then((value)=>{
                            console.log(value.status)
                            if(value && value.status == "member"){
                                addUses(res.link)
                                if(res.uses + 1 >= 100){
                                    deleteLink(res.link)
                                }
                                updatePoints(ctx.from.id,'+ 1')
                                ctx.editMessageText("Успіх! Вам нараховано 1 бал")
                                ctx.reply(`Оберіть дію:`,Markup.keyboard([
                                    Markup.button.callback('Отримати бали (1 бал за 1 підписку)'), 
                                    Markup.button.callback('Отримати інформацію про аккаунт'),
                                    Markup.button.callback('Додати свою ссилку')
                                ])
                                )
                            
                            } else {
                                console.log(value.status)
                                ctx.reply("Перевірте підписку на канал.")
                            }
                        })
                    }) 
                } else {
                    ctx.reply("Посилань не знайдено")
                }
            })
        } 
    })
}) 

bot.hears('Додати свою ссилку', (ctx) => {
    getUser(ctx.from.id,(res)=>{
        if (res){
            getUsersNotAddedLinks(ctx.from.id,async (res1)=>{
                replyButtons = []
                if (res1){
                    for(let link of res1){
                        await bot.telegram.getChat(link.chat_id).then((value)=>{
                            replyButtons.push(Markup.button.callback(`${value.title}`,`${value.title}`))
                            bot.action(value.title,(ctx)=>{
                                getUser(ctx.from.id,(res)=>{
                                    ctx.editMessageReplyMarkup()
                                    console.log(res.points)
                                    if (res.points >= 100){
                                        updatePoints(ctx.from.id, '- 100')
                                        migrateNotAddedLink(link.link,ctx.from.id,link.chat_id)
                                    } else {
                                        ctx.reply('У вас недостатньо балів. Їх можно заробляти підписуючись на канали')
                                    }
                                })
                            })
                        }) 
                    }
                }
                ctx.reply("Перш ніж додати каннал до пошуку, потрібно додати бота на ваш канал та надати йому права адміністратора.Зробіть будь який пост у вашому каналі за для реєстрації цього каналу в боті.\n\nОсь список ваших каналів які ви можете обрати:",Markup.inlineKeyboard(replyButtons,{columns:1}).resize())
            })
        }
    })
}) 

bot.launch()

// https://t.me/advertasingWITSTUDENTSbot