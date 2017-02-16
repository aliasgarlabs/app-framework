// Import config
var cfg = require('./config.js')
var app = require(cfg.appRoot + 'package.json')

// Import packages
var isThere = require('is-there')
var read = require('read-file')
var write = require('write')
var copy = require('cpx')
var path = require('path')
var replace = require('replace-in-file')
var saveJSON = require('jsonfile')
var deleteFiles = require('delete')
saveJSON.spaces = 2

// Get build version to be used
var htaccess = read.sync(path.resolve(cfg.appRoot, 'www/.htaccess'), 'utf8')
var version = htaccess.match(/build-(.+)\//)[1]

var checkBuild = function (callback) {
  if (!isThere(cfg.appRoot + 'www/build-' + version)) {
    showOnly('Run "npm run patch" to build your App before deployment')
  } else {
    callback()
  }
}

// Get Firebase bin folder
let firebaseFolder = path.resolve(cfg.projectRoot, 'node_modules/.bin')

// Delete temp files
if (isThere(path.resolve(firebaseFolder, '.firebaserc'))) {
  deleteFiles.sync([path.resolve(firebaseFolder, '.firebaserc')], {force: true})
}
if (isThere(path.resolve(firebaseFolder, 'firebase.json'))) {
  deleteFiles.sync([path.resolve(firebaseFolder, 'firebase.json')], {force: true})
}
if (isThere(path.resolve(firebaseFolder, 'database-rules.json'))) {
  deleteFiles.sync([path.resolve(firebaseFolder, 'database-rules.json')], {force: true})
}
if (isThere(path.resolve(firebaseFolder, 'storage-rules.txt'))) {
  deleteFiles.sync([path.resolve(firebaseFolder, 'storage-rules.txt')], {force: true})
}
if (isThere(path.resolve(firebaseFolder, 'www'))) {
  deleteFiles.sync([path.resolve(firebaseFolder, 'www/**/*'), path.resolve(firebaseFolder, 'www')], {force: true})
}

// Create file with standard database rules
if (!isThere(cfg.appRoot + 'database-rules.json')) {
  write.sync(cfg.appRoot + 'database-rules.json', '{}')
  saveJSON.writeFileSync(cfg.appRoot + 'database-rules.json', {
    'rules': {
      '.read': 'auth != null',
      '.write': 'auth != null'
    }
  })
}

// Create file with standard storage rules
if (!isThere(cfg.appRoot + 'storage-rules.txt')) {
  let stdRules = 'service firebase.storage {\n' +
                 '  match /b/' + app.firebase.storageBucket + '/o {\n' +
                 '    match /{allPaths=**} {\n' +
                 '      allow read, write: if request.auth != null;\n' +
                 '    }\n' +
                 '  }\n' +
                 '}\n'
  write.sync(cfg.appRoot + 'storage-rules.txt', stdRules)

// Update storage bucket
} else {
  replace.sync({
    files: cfg.appRoot + 'storage-rules.txt',
    from: /\/b\/(.+)\/o/,
    to: '/b/' + app.firebase.storageBucket + '/o'
  })
}

// Write project config
if (!isThere(path.resolve(firebaseFolder, '.firebaserc'))) {
  write.sync(path.resolve(firebaseFolder, '.firebaserc'), '{}')
}
saveJSON.writeFileSync(path.resolve(firebaseFolder, '.firebaserc'), {
  'projects': {
    'default': app.firebase.authDomain.substr(0, app.firebase.authDomain.indexOf('.firebaseapp.com'))
  }
})

// Define Firabase config
let config = {
  database: {
    rules: 'database-rules.json'
  },
  storage: {
    rules: 'storage-rules.txt'
  },
  hosting: {
    'public': 'www'
  }
}

// Copy files
copy.copySync(path.resolve(cfg.appRoot, 'database-rules.json'), firebaseFolder)
copy.copySync(path.resolve(cfg.appRoot, 'storage-rules.txt'), firebaseFolder)
copy.copySync(path.resolve(cfg.appRoot, 'www/build-' + version + '/**/*'), path.resolve(firebaseFolder, 'www'))

// Write Firebase config
saveJSON.writeFileSync(path.resolve(firebaseFolder, 'firebase.json'), config)

module.exports = {}
