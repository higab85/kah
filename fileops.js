// Renderer process has to get `app` module via `remote`, whereas the main process can get it directly
// app.getPath('userData') will return a string of the user's app data directory path.
// taken from:
// https://medium.com/@ccnokes/how-to-store-user-data-in-electron-3ba6bf66bc1e
const {app, dialog} = (require('electron').remote || require('electron'))
const gulp = require('gulp')
const g_nunjucks = require('gulp-nunjucks')
const AdmZip = require('adm-zip')
const fs = require('fs')
const path = require('path')
const Store = require('./store.js')

const store = new Store({
  // We'll call our data file 'user-preferences'
  configName: 'user-preferences',
  defaults: {
    // 800x600 is the default size of our window
    windowBounds: { width: 800, height: 600 }
  }
});

// TODO: if a config or project is dragged onto the app, it will be taken care of
var projectDir    = getData("projectDir")
var srcDir        = path.join(getData("projectDir"), getData("source-path"))
var buildDir      = path.join(getData("projectDir"), getData("build-path"))
var tempDir       = path.join(app.getPath("userData"),"tmp")
var currentDir    = path.join(app.getPath("userData"), "current")

function getData(data){
  try {
    return store.get(data)
  } catch (e) {
    // if no projectDir found, we'll let the user specify where the project
    // folder is.
    if(data === "projectDir"){
      dialog.showMessageBox({type: "warning",
        message:"Please let us know where your project is saved",
        buttons: ["OK"]}, function(){
          dialog.showOpenDialog({ properties: "openDirectory"}, (folderName) => {
            // if no folder specified, app quits
            if (folderName === undefined)
              dialog.showMessageBox({type: "error",
                message:"No directory specified. To specify folder, please restart this application.", buttons:"OK"})
            else {
              store.set("projectDir", folderName)
            }
        })
      })
    }
    console.log(e)
  }
}

// builds source to destination
// http://samwize.com/2013/09/01/how-you-can-pass-a-variable-into-callback-function-in-node-dot-js/
function buildFile(source, destination){
  console.log("Building:",source, "to",destination)
  gulp.src(source)
  .pipe(g_nunjucks.compile())
  .pipe(gulp.dest(destination))
}

function saveCurrentFile() {
  // tempFiles is the folder in which each change is saved
  //(program files /tmp)
  // tempFile is the name of the file in .tmp
  var tempFileName = fs.readdirSync(tempDir)[0]
  // Avoids double save crash. It would crash if file was saved when there
  // was no file in .tmp . Also fixes issue of lingering files in .tmp
  if (!tempFileName){
    console.log("No changes made!!");
    return
  }
  var tempFile = path.join(tempDir,tempFileName)

  console.log("buildsource:",path.join(srcDir,tempFileName));
  // copy file from .tmp to src
  // https://stackoverflow.com/questions/11293857/fastest-way-to-copy-file-in-node-js
  // fs.createReadStream(path.join(buildDir,editable.page)).pipe(fs.createWriteStream(path.join(program_files, ".tmp", editable.page)));
  fs.createReadStream(tempFile).pipe(fs.createWriteStream(path.join(srcDir,tempFileName)))

  buildFile(path.join(srcDir,tempFileName), buildDir)

  // delete all tmp files
  fs.readdir(tempDir, (err, files) => {
    for (var file in files){
      fs.unlink(path.join(tempDir, files[file]), (err) => {
        if (err) throw err;
        console.log('successfully deleted:' + files[file]);
      });
    }
  })

  // // copy file to .tmp so it can be used by other .js files
  // // https://stackoverflow.com/questions/11293857/fastest-way-to-copy-file-in-node-js
  // fs.createReadStream(path.join(buildDir,editable.page)).pipe(fs.createWriteStream(path.join(program_files, ".tmp", editable.page)));
  console.log("saved changes")
}

function exportCurrent() {
  dialog.showSaveDialog({ filters: [
    { name: 'zip', extensions: ['zip'] }
  ]}, (fileName) => {
    if (fileName === undefined)
      return

    // create zip file
    var zip = new AdmZip()
    // tempFile is the name of the file in .tmp
    var currentFile = fs.readdirSync(app.getAppPath() + "/.current")[0]
    zip.addLocalFile(path.join(projectDir, "build", currentFile), "build")
    zip.addLocalFile(path.join(projectDir, "src", currentFile), "src")

    // Write zip file
    zip.writeZip(fileName)
  })
}

// function remakeFile(blocks, template){
//   return new remakeFileFunc(blocks, template)
// }

// builds template back again from array
function remakeFile(blocks, template){
  // return "togo? no no. Cote divoure"
  console.log("file-remake");
  var output = ""
  output+= template+"\n"
  var block = 0
  for(block in blocks){
    output+="{% block " + blocks[block].title + " %}\n" + blocks[block].content + "\n{% endblock %}\n"
    console.log(output);
  }

  return output
}

function makeArray(blocks){
  var array = {}
  for(prop in blocks)
    array[blocks[prop].title] = blocks[prop].content
  return array
}

function checkTmpFolder(pageName){

  var tempFileName = fs.readdirSync(tempDir)[0]

  // We first check if there's a tmp file at all
  if (tempFileName != pageName && tempFileName){
    console.log("Unsaved file in .tmp!");
    // prompt whether user wants to save changes or discard
    dialog.showMessageBox({type: "warning",
      message:"You have not saved your progress. Would you like to discard all changes or save?",
      buttons: ["Discard Changes", "Save"]}, function(buttonIndex){
        if(buttonIndex==0){
          // if discard changes -> delete changes (flush .tmp)
          fs.readdir(tempDir, (err, files) => {
            for (var file in files){
              fs.unlink(path.join(tempDir, files[file]), (err) => {
                if (err) throw err;
                console.log('successfully deleted:' + path.join(tempDir, files[file]));
              });
            }
          }, v=>false)
        }

      // if save ->  save changes made (save .tmp)
        else
          v=>true
      })
    // else -> flush .tmp
  }
  else
    v=>false

  // flush current dir
  flushFolder(currentDir, pageName)
  // fs.readdir(fileops.currentDir, (err, files) => {
  //   for (var file in files){
  //     if (files[file] != pageName)
  //       fs.unlink(path.join(fileops.currentDir, files[file]), (err) => {
  //         if (err) throw err;
  //         console.log('successfully deleted:' + path.join(fileops.currentDir, files[file]));
  //     });
  //   }
  // })
}

// Deletes all files in a folder (meant for .tmp and .current)
function flushFolder(folder, fileToAvoid){
  fs.readdir(folder, (err, files) => {
    for (var file in files){
      if (files[file] != fileToAvoid)
      fs.unlink(path.join(folder, files[file]), (err) => {
        if (err) throw err;
        console.log('successfully deleted:' + files[file]);
      });
    }
  })
}

// flush tmp folder
function flushTmp(){
  flushFolder(tempDir, null)
}
function flushAll(){
  flushFolder(tempDir, null)
  flushFolder(currentDir, null)
}

module.exports = {
  //functions
  saveCurrentFile,
  exportCurrent,
  remakeFile,
  makeArray,
  checkTmpFolder,
  buildFile,
  flushTmp,
  flushAll,
  // variables
  srcDir,
  currentDir,
  tempDir,
  buildDir
}
