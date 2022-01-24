//global.AbortController = require("node-abort-controller").AbortController;


const { Client, Intents, MessageEmbed, Permissions, VoiceChannel } = require('discord.js');
const client = new Client({ intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES"] });
const { Opus } = require('@discordjs/opus');
const _sodium = require('libsodium-wrappers');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    entersState,
    StreamType,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    NoSubscriberBehavior
} = require('@discordjs/voice');
const { youtubeAPI, token } = require('./config.json');
const ffmpeg = require("ffmpeg-static")
const avconv = require("avconv")
const fs = require('fs');
const { OpusEncoder } = require('@discordjs/opus');


const ytdl = require('ytdl-core-discord');
//const ytdl = require('play-dl');
const { video_basic_info, stream } = require('play-dl');
const { url } = require('inspector');
const Youtube = require('simple-youtube-api');
//const { youtubeAPI } = require('./youtube-config.json');
const { validateID } = require('ytdl-core');
const youtube = new Youtube(youtubeAPI);
const options = { transports: ['websocket'], pingTimeout: 3000, pingInterval: 5000 };

//https://freemp3cloud.com/
//https://www.youtube.com/watch?v=Q0PyIlH2o7s
var playingNow = 0;
var playingNow2 = 0;
//
//var playingSong = false;
//Define the channel and dispatcher for music.
var channel;
var dispatcher;
var musicPlaying = false;

const queue = new Map();
//const serverQueue = queue.get(message.guild.id);
// Has to do with songs and such ->

var qArray = [];
var currentSong = 0;
//var queue = new Map();

var songId = 0;
let keyObj = {}
var looping = false;
let songNbr = 0;

var queueStop = false;

require('events').EventEmitter.defaultMaxListeners = 15;

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}!`);
    //client.user.

    client.user.setActivity("Music in Workers Republic ", {
        type: "PLAYING"
    });
});
//!Important
//var servers = {};
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'play') {
        //await interaction.reply('No help from me, sorry');
        //let args = commandName.content.substring(message.content.indexOf(" ") + 1, message.content.length);
        const music = interaction.options.get("query").value
        console.log(music);
        
        if (interaction.member.voice.channel) {
            try {
                channel = interaction.member.voice.channel;
                let url = await searchYouTubeAsync(music);
                //qArray.push(url);

                let songInfo = await ytdl.getInfo(url);
                const song = {
                    title: songInfo.videoDetails.title,
                    url: songInfo.videoDetails.video_url,
                    thumbnail: songInfo.videoDetails.thumbnails[2].url,
                };


                // Add to Array.
                //qArray.push({ id: songId, songname: song.title, songurl: url });
                //songId++;
                var addToQueue = new newSong(song.title, song.url, song.thumbnail);
                qArray.push(addToQueue);
                console.log(qArray);


                //channel join was here before I moved it to playSong function!
                if (musicPlaying === false) {
                    if (queueStop == true) {
                        var nextsong = currentSong + 1;
                        playMusic(interaction, nextsong);
                    } else {
                        playMusic(interaction, currentSong);
                    }

                }
                else {
                    //message.channel.send(`Added song ${song.title} to queue!`);
                    const addedSong = new MessageEmbed()
                        .setColor('#FE7FDE')
                        .setURL(`${song.url}`)
                        .setTitle(`Queued ${song.title}`)
                        .setDescription(`Song is now added to queue, check !queue to check current list!`)
                        .setThumbnail(`${song.thumbnail}`)
                        .setTimestamp()
                        .setFooter(client.user.username, client.user.avatarURL);

                    await interaction.reply({ embeds: [addedSong] });
                    console.log(qArray);
                }
            }
            catch (e) {
                console.log(e);
                await interaction.reply({ files: ["./assets/img/error.gif"] });
            }
        } else {
            await interaction.reply('You need to join a voice channel first!');
        }
        


    } else if (commandName === 'skip') {
        //await interaction.reply('Enable the news stream now!');
        var lastItem = qArray[qArray.length - 1]
        var playlist = qArray[currentSong];

        console.log(playlist);
        console.log("Last item in queue:", lastItem);

        if (playlist != lastItem) {
            musicPlaying = false;
            console.log("Skipping the current song!")
            const skipSong = currentSong + 1;
            playMusic(message, skipSong);
            currentSong = skipSong;
            console.log(currentSong);
            await interaction.reply("Bla, Skipping current song!");
        }
        else {
            await interaction.reply("The lastest song is currently playing use `!loop` to make the playlist loop!")
        }
    }
    else if (commandName === 'queue') {
        await interaction.reply('Disabling the news stream now.');
    }
});





/*
command(client, 'addtoqueue', async (message) => {
  let args = message.content.substring(message.content.indexOf(" ") + 1, message.content.length);
  var addToQueue = new newSong(args, args + ".test");
  qArray.push(addToQueue);
})
*/
/* 
command(client, 'queue', async (message) => {

    console.log(qArray);
    var listpos = 1;

    const list = new Discord.MessageEmbed();
    list.setTitle('Current Song Queue in Workers Republic!')
    list.setColor('#FF6358')
    for (let i = 0; i < qArray.length; i++) {

        list.addField('_________', `**${listpos}) **` + `${qArray[i].title}`, false)
        listpos++;
    }
    list.setThumbnail('https://i.pinimg.com/originals/d7/99/40/d799402d1b06656706a3c6729e8b3c2f.gif')
    list.setTimestamp()
    list.setFooter(client.user.username, client.user.avatarURL);

    message.channel.send(list);
    //message.channel.send(`song: (${song.id})  \n`);
    //https://www.javaer101.com/en/article/40459438.html
})
command(client, 'get', async (message) => {
    var queue = getQueue();
    console.log(queue);
})
command(client, 'loop', async (message) => {
    if (looping == true) {
        message.channel.send("The current queue will not loop!");
    }
    else if (looping == false) {
        looping = true;
        message.channel.send("Looping the current queue!");
        if (musicPlaying == false) {
            playMusic(message, 0)
        }
        else { console.log("The looping has begun but the dispatcher is still playing music currently!") }
    }
})
command(client, 'skip', async (message) => {
    var lastItem = qArray[qArray.length - 1]
    var playlist = qArray[currentSong];

    console.log(playlist);
    console.log("Last item in queue:", lastItem);

    if (playlist != lastItem) {
        musicPlaying = false;
        console.log("Skipping the current song!")
        const skipSong = currentSong + 1;
        playMusic(message, skipSong);
        currentSong = skipSong;
        console.log(currentSong);
        message.channel.send("Bla, Skipping current song!");
    }
    else {
        message.channel.send("The lastest song is currently playing use `!loop` to make the playlist loop!")
    }
})
command(client, 'remove', async (message) => {
    //qArray.pop();
    //songId--;
    message.channel.send("```hey I'm sorry but I'm redoing this command atm - Rinna```")
    //message.channel.send("Removed the last added song!(Reminder that this command can break the bot atm)");
})
command(client, 'stop', async (message) => {
    dispatcher.destroy();
    message.channel.send("Stopped the current playing music!");
    musicPlaying == false;

    queueStop == true;
})


//....
});
*/

//https://github.com/discordjs/discord.js/blob/master/docs/topics/voice.md




async function playMusic(interaction, song) {
    console.log(song);
    const currentIndex = qArray.indexOf(currentSong);
    const nextIndex = (currentIndex + 1) % qArray.length;
    //console.log(currentIndex)
    //console.log(nextIndex)
    currentSong = song;


    //https://stackoverflow.com/questions/2672380/how-do-i-check-in-javascript-if-a-value-exists-at-a-certain-array-index
    console.log('\x1b[31m%s\x1b[0m', "Async func song: " + song);
    //let currentSongUrl = qArray[song].songurl;

    const currentSongUrl = qArray[song].url;

    console.log("The song url is: " + currentSongUrl);
    //const currentSongUrl2 = "https://www.youtube.com/watch?v=5wAMj34aTAI"

    //https://github.com/amishshah/ytdl-core-discord/issues/391
    //https://github.com/amishshah/ytdl-core-discord/pull/392
    //https://github.com/discordjs/voice/blob/main/examples/music-bot/src/bot.ts


    var stream = await ytdl(currentSongUrl, {
        filter: 'audioonly',
        highWaterMark: 1 << 25,
    });
    const player = createAudioPlayer();
    const resource = createAudioResource(stream, { inputType: StreamType.Opus });
    //const resource = createAudioResource(stream);

    joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
    }).subscribe(player)

    player.play(resource);

    //player.on(AudioPlayerStatus.Playing, () => {
    //console.log('The audio player has started playing!');
    musicPlaying = true;
    const streamInfo = {
        title: qArray[song].title,
        url: qArray[song].url,
        thumbnail: qArray[song].thumbnail,
    };
    const songEmbed = new MessageEmbed()
        .setColor('#eaf44d')
        .setURL(`${streamInfo.url}`)
        .setTitle(`Playing ${streamInfo.title}`)
        .setDescription(`Currently playing the song in ${interaction.member.voice.channel}`)
        .setThumbnail(`${streamInfo.thumbnail}`)
        .setTimestamp()
    //.setFooter(client.user.username, client.user.avatarURL);

    await interaction.reply({ embeds: [songEmbed] });

    //});

    player.on('idle', () => {
        console.log("Stopped");
        musicPlaying = false;

        console.log(currentSong);

        let nowPlaying = qArray[song];
        let lastItem = qArray[qArray.length - 1];


        console.log('\x1b[33m%s\x1b[0m', "Last item value:" + lastItem.url);

        if (nowPlaying != lastItem) {
            console.log("Skipping the current song!")
            var newSong = song + 1;
            console.log("Play with current song: " + newSong);
            console.log("New song value: " + newSong)
            //goNext(newSong)
            //playMusic("mp.setDataSource(audioArray[currentIndex + 1]);")
            playMusic(message, newSong);
        }
        if (nowPlaying == lastItem) {
            if (looping == true) {
                playMusic(message, 0);
            }
        }
        else {
            console.log("The last song is currently playing use `!loop` to make the playlist loop!")
            interaction.channel.send("The current last song has been played now!");
            queueStop = true;
        }


    });


    //});
}



function newSong(title, url, thumbnail) {
    //this.id = id;
    this.title = title;
    this.url = url;
    this.thumbnail = thumbnail;
}
/*
async function goNext(song) {
  playMusic(song);
}
*/

async function getQueue() {
    var queueArray = qArray.length;
    return queueArray;
}


async function searchYouTubeAsync(args) {
    //console.log("Loading async function!");
    var video = await youtube.searchVideos(args.toString().replace(/,/g, ' '));
    var vidURL = "";
    var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\?v=)([^#\&\?]*).*/;
    var match = args.match(regExp);
    //if (args.includes("youtube.com")) {
    if (match) {
        vidURL = args;
    }
    else {
        vidURL = "https://www.youtube.com/watch?v=" + video[0].raw.id.videoId;
    }
    return vidURL;
}

client.login(token)