const { app, BrowserWindow } = require('electron')
const path  = require('path');

let win

async function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({
	width: 800,
	height: 600
  })
 
  try{
	let res = await win.loadFile(__dirname + "/dist/gerbil/index.html")
  } catch(error){
  	console.log(error);
  }
 
  win.on('closed', () => {
	win = null
  })
}

app.on('ready', createWindow)