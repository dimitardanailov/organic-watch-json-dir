const chokidar = require('chokidar')
const fs = require('fs')

module.exports = class {
  constructor (plasma, dna) {
    this.dna = dna
    this.plasma = plasma
    this.cache = {}
    this.dna.emit = dna.emit || {}
    this.dna.emit.dataPropertyName = this.dna.emit.dataPropertyName || 'data'
    this.watcher = chokidar.watch(dna.location + '/*.json')
    this.watcher
      .on('add', this.handle('add').bind(this))
      .on('change', this.handle('change').bind(this))
      .on('unlink', this.handle('unlink').bind(this))
      .on('ready', this.ready.bind(this))
    this.plasma.on('kill', () => {
      this.watcher.close()
    })
  }
  async ready () {
    if (this.dna.emit.ready) {
      this.plasma.emit(this.dna.emit.ready)
    }
  }
  handle (type) {
    return async (path) => {
      let typeToEmitMap = {
        'add': 'onNewFile',
        'change': 'onChangeFile',
        'unlink': 'onDeleteFile'
      }
      if (this.dna.emit[typeToEmitMap[type]]) {
        let chemical = {
          type: this.dna.emit[typeToEmitMap[type]],
          path: path
        }
        if (type !== 'unlink') {
          chemical[this.dna.emit.dataPropertyName] = await this.loadAsJSON(path)
        } else {
          chemical[this.dna.emit.dataPropertyName] = this.popCached(path)
        }
        this.plasma.emit(chemical)
      }
    }
  }
  loadAsJSON (jsonpath) {
    return new Promise((resolve, reject) => {
      fs.readFile(jsonpath, (err, data) => {
        if (err) {
          console.error(jsonpath)
          return reject(err)
        }

        try {
          let jsondata = JSON.parse(data.toString())
          this.cache[jsonpath] = jsondata
          resolve(jsondata)
        } catch (err) {
          console.error(err)
          reject(err)
        }
      })
    })
  }
  popCached (path) {
    let result = this.cache[path]
    delete this.cache[path]
    return result
  }
}
