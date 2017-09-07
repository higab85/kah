'use strict'
const electron = require('electron')
const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron')
const fis = require('fs')
const gulp = require('gulp')
const paths = require('path')
const g_nunjucks = require('gulp-nunjucks')

////////////////////
// Top Menu
///////////////////

let template = [{
  label: 'Edit',
  submenu: [{
      label: 'Undo',
      accelerator: 'CmdOrCtrl+Z',
      role: 'undo'
    }, {
      label: 'Redo',
      accelerator: 'Shift+CmdOrCtrl+Z',
      role: 'redo'
    }, {
      type: 'separator'
    }, {
      label: 'Cut',
      accelerator: 'CmdOrCtrl+X',
      role: 'cut'
    }, {
      label: 'Copy',
      accelerator: 'CmdOrCtrl+C',
      role: 'copy'
    }, {
      label: 'Paste',
      accelerator: 'CmdOrCtrl+V',
      role: 'paste'
    },
    //  {
    //   // used http://mylifeforthecode.com/getting-started-with-standard-dialogs-in-electron/
    //   label: 'export',
    //   accelerator: 'CmdOrCtrl+E',
    //   click: () => {
    //     dialog.showSaveDialog({ filters: [
    //       { name: 'html', extensions: ['html'] }
    //     ]}, (fileName) => {
    //       if (fileName === undefined)
    //         return
    //
    //        fis.readdir('.tmp', (err, files) => {
    //          for(var file in files)
    //            fis.createReadStream(paths.join('.tmp', files[file])).pipe(fis.createWriteStream(fileName));
    //        })
    //      }
    //   )}
    // },

    // will Take the file in program directory and do the same as save in main.js
    //
     {
      label: 'Save',
      accelerator:'CmdOrCtrl+S',
      click: () => {
        console.log("Saving...")
        // tempFiles is the folder in which each change is saved
        //(program files /tmp)
        var tempDir = app.getAppPath() + "/.tmp"
        // tempFile is the name of the file in .tmp
        var tempFileName = fis.readdirSync(tempDir)[0]
        // Avoids double save crash. It would crash if file was saved when there
        // was no file in .tmp . Also fixes issue of lingering files in .tmp
        if (!tempFileName)
          return
        var tempFile = paths.join(tempDir,tempFileName)
        var projectDir = "/home/tyler/Documents/work/drugsandme/v2-test"
        var buildDir = paths.join(projectDir, "/build")
        var srcDir = paths.join(projectDir, "/src")

        console.log(tempFile, tempFileName)

        // copy file from .tmp to src
        // https://stackoverflow.com/questions/11293857/fastest-way-to-copy-file-in-node-js
        // fis.createReadStream(path.join(buildDir,editable.page)).pipe(fis.createWriteStream(path.join(program_files, ".tmp", editable.page)));
        console.log("copying ",tempFile, " to ", srcDir,tempFileName)
        fis.createReadStream(tempFile).pipe(fis.createWriteStream(paths.join(srcDir,tempFileName)))
        // render template and save to buildir
        // http://samwize.com/2013/09/01/how-you-can-pass-a-variable-into-callback-function-in-node-dot-js/
        console.log("compiling: ", srcDir, tempFileName);
        gulp.src(paths.join(srcDir,tempFileName))
        .pipe(g_nunjucks.compile())
        .pipe(gulp.dest("/home/tyler/Documents/work/drugsandme/v2-test/build"))

        // delete all tmp files
        fis.readdir(tempDir, (err, files) => {
          for (var file in files){
            fis.unlink(paths.join(tempDir, files[file]), (err) => {
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
    }
  ]
}, {
  label: 'View',
  submenu: [{
    label: 'Reload',
    accelerator: 'CmdOrCtrl+R',
    click: function (item, focusedWindow) {
      if (focusedWindow) {
        // on reload, start fresh and close any old
        // open secondary windows
        if (focusedWindow.id === 1) {
          BrowserWindow.getAllWindows().forEach(function (win) {
            if (win.id > 1) {
              win.close()
            }
          })
        }
        focusedWindow.reload()
      }
    }
  }, {
    label: 'Toggle Full Screen',
    accelerator: (function () {
      if (process.platform === 'darwin') {
        return 'Ctrl+Command+F'
      } else {
        return 'F11'
      }
    })(),
    click: function (item, focusedWindow) {
      if (focusedWindow) {
        focusedWindow.setFullScreen(!focusedWindow.isFullScreen())
      }
    }
  }, {
    label: 'Toggle Developer Tools',
    accelerator: (function () {
      if (process.platform === 'darwin') {
        return 'Alt+Command+I'
      } else {
        return 'Ctrl+Shift+I'
      }
    })(),
    click: function (item, focusedWindow) {
      if (focusedWindow) {
        focusedWindow.toggleDevTools()
      }
    }
  }, {
    type: 'separator'
  }, {
    label: 'App Menu Demo',
    click: function (item, focusedWindow) {
      if (focusedWindow) {
        const options = {
          type: 'info',
          title: 'Application Menu Demo',
          buttons: ['Ok'],
          message: 'This demo is for the Menu section, showing how to create a clickable menu item in the application menu.'
        }
        electron.dialog.showMessageBox(focusedWindow, options, function () {})
      }
    }
  }]
}, {
  label: 'Window',
  role: 'window',
  submenu: [{
    label: 'Minimize',
    accelerator: 'CmdOrCtrl+M',
    role: 'minimize'
  }, {
    label: 'Close',
    accelerator: 'CmdOrCtrl+W',
    role: 'close'
  }, {
    type: 'separator'
  }, {
    label: 'Reopen Window',
    accelerator: 'CmdOrCtrl+Shift+T',
    enabled: false,
    key: 'reopenMenuItem',
    click: function () {
      app.emit('activate')
    }
  }]
}, {
  label: 'Help',
  role: 'help',
  submenu: [{
    label: 'Learn More',
    click: function () {
      electron.shell.openExternal('http://electron.atom.io')
    }
  }]
}]

function addUpdateMenuItems (items, position) {
  if (process.mas) return

  const version = electron.app.getVersion()
  let updateItems = [{
    label: `Version ${version}`,
    enabled: false
  }, {
    label: 'Checking for Update',
    enabled: false,
    key: 'checkingForUpdate'
  }, {
    label: 'Check for Update',
    visible: false,
    key: 'checkForUpdate',
    click: function () {
      require('electron').autoUpdater.checkForUpdates()
    }
  }, {
    label: 'Restart and Install Update',
    enabled: true,
    visible: false,
    key: 'restartToUpdate',
    click: function () {
      require('electron').autoUpdater.quitAndInstall()
    }
  }]

  items.splice.apply(items, [position, 0].concat(updateItems))
}

function findReopenMenuItem () {
  const menu = Menu.getApplicationMenu()
  if (!menu) return

  let reopenMenuItem
  menu.items.forEach(function (item) {
    if (item.submenu) {
      item.submenu.items.forEach(function (item) {
        if (item.key === 'reopenMenuItem') {
          reopenMenuItem = item
        }
      })
    }
  })
  return reopenMenuItem
}

if (process.platform === 'darwin') {
  const name = electron.app.getName()
  template.unshift({
    label: name,
    submenu: [{
      label: `About ${name}`,
      role: 'about'
    }, {
      type: 'separator'
    }, {
      label: 'Services',
      role: 'services',
      submenu: []
    }, {
      type: 'separator'
    }, {
      label: `Hide ${name}`,
      accelerator: 'Command+H',
      role: 'hide'
    }, {
      label: 'Hide Others',
      accelerator: 'Command+Alt+H',
      role: 'hideothers'
    }, {
      label: 'Show All',
      role: 'unhide'
    }, {
      type: 'separator'
    }, {
      label: 'Quit',
      accelerator: 'Command+Q',
      click: function () {
        app.quit()
      }
    }]
  })

  // Window menu.
  template[3].submenu.push({
    type: 'separator'
  }, {
    label: 'Bring All to Front',
    role: 'front'
  })

  addUpdateMenuItems(template[0].submenu, 1)
}

if (process.platform === 'win32') {
  const helpMenu = template[template.length - 1].submenu
  addUpdateMenuItems(helpMenu, 0)
}

app.on('browser-window-created', function () {
  let reopenMenuItem = findReopenMenuItem()
  if (reopenMenuItem) reopenMenuItem.enabled = false
})

app.on('window-all-closed', function () {
  let reopenMenuItem = findReopenMenuItem()
  if (reopenMenuItem) reopenMenuItem.enabled = true
})

app.on('ready', function() {
    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
    var mainWindow = new electron.BrowserWindow({width: 600, height: 800})
    mainWindow.loadURL('file://' + __dirname + '/index.html')
})
