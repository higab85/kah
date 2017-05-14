'use strict'
const fs = require("fs")
const readline = require('readline')
const editor = require('vue2-medium-editor/dist/vue-medium-editor')
const Vue = require('vue/dist/vue.js')
const nunjucks = require('nunjucks')
const gulp = require('gulp')
const path = require('path')
const g_nunjucks = require('gulp-nunjucks')
const electro = require('electron')

// TODO:: FIX THIS SHIT
// var appjs = require(path.join(__dirname, "app.js")).template

// TODO: read from config file (config file also needs path to static folder)
var projectDir = '/home/tyler/Documents/work/drugsandme/v2-test/'
var pagesDir = projectDir + "src/"
var buildDir = projectDir + "build/"
var program_files = "/home/tyler/Downloads/kah/"

var preview = new Vue ({
  el: "#preview",
  data: {
    currentURL: "",
    webview: ""
  },
  methods: {
    renderFile: function(page) {
      preview.currentURL = "file://"+buildDir+page
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
        console.log(title)
        contentArray.push({title:title, content:text})
        title = ""
        text = ""
        readingContent=0
      }
      // if the block hasn't finished yet, keep adding to it
      else{
        text+= line
      }
    }
    else if(line.startsWith("{%")){
      var patt = /block (.*) %}/i
      var extpatt = /extends (.*) %}/i
      // if the line matches the regex from patt, then titile will equal it, and
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

// builds template back again from array
var remakeFile = (blocks) =>{
  var output = ""
  output+= editable.parentTemplate+"\n"
  for(block in blocks){
    output+="{% block " + blocks[block].title + " %}\n" + blocks[block].content + "\n{% endblock %}\n"
  }
  return output
}



function makeArray(blocks){
  var array = {}
  for(prop in blocks)
    array[blocks[prop].title] = blocks[prop].content
  return array
}

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
      editable.filepath = pagesDir+page
      console.log("editing: " + editable.filepath)
      editable.blocks = parseFile(editable.filepath)

  },
    applyTextEdit: function (text, index) {
      console.log('index: ' + index)
      editable.blocks[index].content = text
  },
  // recompiles template on save, and reload
    saveChanges: () => {

      var newContent = remakeFile(editable.blocks)
      fs.writeFile(editable.filepath, newContent, (err) => {
        if (err) {
            alert("An error ocurred updating the file" + err.message);
            console.log(err);
            return;
        }
      });


      // render template and save to buildir
      console.log("dest: " + buildDir+editable.page)
      // http://samwize.com/2013/09/01/how-you-can-pass-a-variable-into-callback-function-in-node-dot-js/
      setTimeout( function (){
        preview.reloadPage()
      }, 100)
      gulp.src(editable.filepath)
      .pipe(g_nunjucks.compile())
  		.pipe(gulp.dest(buildDir))

      // delete previous tmp file
      fs.readdir('.tmp', (err, files) => {
        for (file in files){
          fs.unlink(path.join('.tmp', files[file]), (err) => {
            if (err) throw err;
            console.log('successfully deleted.');
          });
        }
      })

      // copy file to .tmp so it can be used by other .js files
      // https://stackoverflow.com/questions/11293857/fastest-way-to-copy-file-in-node-js
      fs.createReadStream(path.join(buildDir,editable.page)).pipe(fs.createWriteStream(path.join(program_files, ".tmp", editable.page)));
    }

  }
})


var header = new Vue ({
  el: "#header",
  methods: {
    save: function() {
      editable.saveChanges()
    },
    // TODO: exports file user is currently working on
    export_file: () => {
      electro.dialog.showSaveDialog({ filters: [
        { name: 'html', extensions: ['html'] }
      ]}, (fileName) => {
        if (fileName === undefined)
          return

         fis.readdir('.tmp', (err, files) => {
           for(file in files)
             fs.createReadStream(paths.join('.tmp', files[file])).pipe(fs.createWriteStream(fileName));
         })
       }
     )}

  }
})



/////////////////////////////////////
// file - sidebar populating
////////////////////////////////////

// TODO: read rejectedFiles from config file
// TODO: Make it so they are regular expressions
var rejectedFiles = ['partials']

var pagesInFolder = new Vue({
  el: "#pages",
  data: {
    pages: []
  },
  methods:{
    selectFile: function(page){
      console.log("loading file: " + page.name)
      preview.renderFile(page.name)
      editable.editFile(page.name)
      console.log("editable-block: " + editable.blocks)
    }
  }
})

fs.readdir(pagesDir, function done(err, list){
  if(err){
    return console.log(err);
  }

  for(var item in list){
    if(!(rejectedFiles.includes(list[item])))
      pagesInFolder.pages.push({name: list[item]})
    }
});




// [1]: http://ourcodeworld.com/articles/read/106/how-to-choose-read-save-delete-or-create-a-file-with-electron-framework
// [2]:
