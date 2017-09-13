'use strict'
const fs = require("fs")
const readline = require('readline')
const editor = require('vue2-medium-editor/dist/vue-medium-editor')
const Vue = require('vue/dist/vue.js')
const path = require('path')
const Store = require('./store.js');
const fileops = require('./fileops.js')
// let mainWindow; //do this so that the window object doesn't get GC'd



// TODO: If no local project, you will be welcomed and asked for a git repo url
// This will be cloned.


// var branch = 'master'
// const simpleGit = require('simple-git')(projectDir)

// parses file by scanning for blocks and returning array with:
// { title:blocktitle, content:blockcontent}
var parseFile = (file) =>{
  var title = ""
  var text = ""
  var contentArray = []
  var readingContent = 0 // if 0, it's scanning for another block. if 1, it's reading a block
  // [2]
  const rl = readline.createInterface({
    input: fs.createReadStream(file)
  });

  rl.on('line', function (line) {
    if(readingContent){
      // end of block reached, so chop it off, add to array, and start from scatch
      if(line === "{% endblock %}"){
        // console.log(title)
        contentArray.push({title:title, content:text})
        title = ""
        text = ""
        readingContent=0
      }
      // if the block hasn't finished yet, keep adding to it
      else{
        text += line
      }
    }
    else if(line.startsWith("{%")){
      var patt = /block (.*) %}/i
      var extpatt = /extends (.*) %}/i
      // if the line matches the regex from patt, then title will equal it, and
      // the if will be true
      if(title = patt.exec(line)){
        title = title[1]
        readingContent = 1
      }
      // if the line matches with extend pattern, then editable.parentTemplate = line
      else if (extpatt.exec(line)) {
        editable.parentTemplate = extpatt.exec(line).input
      }
    }
  });
  return contentArray
};

var preview = new Vue ({
  el: "#preview",
  data: {
    currentURL: "",
    webview: ""
  },
  methods: {
    renderFile: function(page) {
      preview.currentURL = "file://"+fileops.buildDir+page
      console.log("currentURL: " + preview.currentURL)
      preview.webview = this.$el.childNodes[0]
      preview.webview.loadURL(preview.currentURL)
    },
    reloadPage: () => {
      console.log("reloading page: " + preview.currentURL)
      preview.webview.loadURL(preview.currentURL)
    }
  }
})

var editable = new Vue({
  el: "#editable",
  data: {
    parentTemplate: "",
    blocks: [],
    filepath: "",
    page: "",
    options: {
      toolbar: {buttons: ['bold', 'strikethrough', 'h1']}
    }
  },
  components: {
    'medium-editor': VueMediumEditor
  },
  methods:{
    editFile: (page) => {
      editable.page = page
      editable.filepath = fileops.pagesDir+page
      console.log("editing: " + editable.filepath)
      editable.blocks = parseFile(editable.filepath)
      console.log("blocks!:",editable.blocks)
      return;

  },

  // applies edits done to text to the block variable (not to file)
    applyTextEdit: function (text, index) {

      // makes sure the function doesn't run if blocks not initialised
      if(!editable.blocks[0])
        return

      if (editable.blocks[index].content === text)
        console.log("no changes!");
      else{
        console.log("editing text!!")
        editable.blocks[index].content = text

        // So that it can also be saved with CmdOrCtrl+S
        // console.log(fileops.remakeFile())

        var newContent = fileops.remakeFile(editable.blocks, editable.parentTemplate)
        console.log("papi",newContent);
        // fs.writeFile( fileops.tempDir + editable.page, newContent, (err) => {
        //   if (err) {
        //       alert("An error ocurred updating the file" + err.message);
        //       console.log(err);
        //       return;
        //   }
        // });
      }
  },


  // Saves changes done to blocks, recompiles template on save, and reload
    saveChanges: () => {
      console.log("blocks", editable.blocks)
      var newContent = fileops.remakeFile(editable.blocks, editable.parentTemplate)
      fs.writeFile(editable.filepath, newContent, (err) => {
        if (err) {
            alert("An error ocurred updating the file" + err.message);
            console.log(err);
            return;
        }
      });

      // render template and save to buildir
      console.log("render", editable.filepath, fileops.buildDir)
      fileops.buildFile(editable.filepath, fileops.buildDir)

      // http://samwize.com/2013/09/01/how-you-can-pass-a-variable-into-callback-function-in-node-dot-js/
      setTimeout( function (){
        preview.reloadPage()
      }, 100)

      // delete all tmp files
      fs.readdir(fileops.tempDir, (err, files) => {
        for (var file in files){
          fs.unlink(path.join(fileops.tempDir, files[file]), (err) => {
            if (err) throw err;
            console.log('successfully deleted:' + files[file]);
          });
        }
      })

    }
  }
})


var header = new Vue ({
  el: "#header",
  methods: {
    // saves file by overwriting the original
    save_file: function() {
      editable.saveChanges()
    },
    // Exports file to wanted directory, so html file can then be sent on
    // to dev
    export_file: () => {
        fileops.exportCurrent()
      }
    // pull dir from repo
    // pull: () => {
    //   simpleGit
    //     .exec(function() {
    //         console.log('Starting pull...');
    //     })
    //     .pull(function(err, update) {
    //       if(update && update.summary.changes) {
    //         console.log('all done.')
    //       }
    //     })
    //     .then(function() {
    //       console.log('pull done.');
    //     });
    //
    // },
    // GIVEN UP ON THIS FEATURE. EXPLAINED WHY ON INDEX.HTML
    // push changes to repo
    // push: () => {
    //   vex.dialog.open({
    //     message: 'Enter your username and password:',
    //     input: [
    //         '<input name="username" type="text" placeholder="Username" required />',
    //         '<input name="password" type="password" placeholder="Password" required />'
    //     ].join(''),
    //     buttons: [
    //         $.extend({}, vex.dialog.buttons.YES, { text: 'Login' }),
    //         $.extend({}, vex.dialog.buttons.NO, { text: 'Back' })
    //     ],
    //     callback: function (data) {
    //         if (!data) {
    //             console.log('Cancelled')
    //         } else {
    //             simpleGit
    //               .add('./*')
    //               .commit("edited content on " + editable.page)
    //               .push('origin', branch)
    //         }
    //     }
    //   })
    // }

  }
})



/////////////////////////////////////
// file - sidebar populating
////////////////////////////////////

// TODO: read rejectedFiles from config file
var rejectedFiles = ['partials', 'article', 'base', 'drug']

var pagesInFolder = new Vue({
  el: "#pages",
  data: {
    pages: []
  },
  methods:{
    selectFile: function(page){

      console.log("copying file from",path.join(fileops.pagesDir,page.name), "to", path.join(fileops.currentDir, page.name))
      // copy file to .current, as it is currently being used
      // https://stackoverflow.com/questions/11293857/fastest-way-to-copy-file-in-node-js
      fs.createReadStream(path.join(fileops.pagesDir,page.name)).pipe(fs.createWriteStream(path.join(fileops.currentDir, page.name)));

      function loadNextFile() {
        // callback function which will load selected file. We need this to happen
        // AFTER save (or discard changes)
          console.log("loading file: " + page.name)
          preview.renderFile(page.name)
          editable.editFile(page.name)
      }


      // If there's a file in .tmp and it's not the current file, then asked to
      // save, so that .tmp folder can be flushed
      if(fileops.checkTmpFolder(page.name)){
        editable.saveChanges()
        loadNextFile()
      }
      else {
         loadNextFile()
      }

    }
  }
})

fs.readdir(fileops.pagesDir, function done(err, list){
  if(err){
    return console.log(err);
  }
  var onlyHTML = list.filter( (file) => file.match(/.html/) )
  for(var item in onlyHTML ){
    // Make a regex expression of all regex expressions in rejectedFiles
    // https://stackoverflow.com/questions/8207066/creating-array-of-regular-expressions-javascript
    var re = new RegExp(rejectedFiles.join("|"), "i");
    if(!(re.test(onlyHTML[item])))
      pagesInFolder.pages.push({name: onlyHTML[item]})
    }
});



// [1]: http://ourcodeworld.com/articles/read/106/how-to-choose-read-save-delete-or-create-a-file-with-electron-framework
// [2]:
