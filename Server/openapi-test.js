const { Configuration, OpenAIApi } = require("openai");

const pool = require("./server.js");

require('dotenv').config();

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);


const getChats = new Promise((resolve, reject) => {
    let chats = [];
    pool.getConnection((err,connection)=>{
        if(err){throw err;}
        else{
            const query = "SELECT time, message, sender_id FROM chats WHERE room_id =?";
            connection.query(query,["room-1-3"],(err,results)=>{
                if(err){throw err;}
                else{

                    let text = "";

                    for(let i =0; i<results.length; i++){

                        let sender = ""
                        if(results[i].sender_id == 3){
                            sender = "You"
                        }else{
                            sender = "Steven"
                        }

                        text = `${text} Message: ${results[i].message}, Sender: ${sender}, Time: ${results[i].time}. `;
                        
                        if(i == results.length - 1){
                            console.log(text);
                            resolve(text);
                        }
                    }
                }
            })
        }
        connection.release();
    })
})

getChats.then((chats)=>{
    async function runCompletion () {
        const completion = await openai.createCompletion({
          model: "text-davinci-003",
          prompt: `Summarize this chat without including greetings and time with "You" being the center of the chat:  ${chats}`,
          max_tokens: 2048,
          temperature: 1,
        });
        console.log(completion.data.choices[0].text);
        // pool.getConnection((err,connection)=>{
        //     if(err){throw err;}
        //     else{
        //         const query = "UPDATE chat_rooms SET summary = ? WHERE room_id=?";
        //         connection.query(query,["room-1-3"],(err,results)=>{
        //             if(err){throw err;}
        //             else{
        //             }
        //         })
        //     }
        //     connection.release();
        // })
        }
        
        runCompletion();
})

