const { existsSync, mkdirSync } = require("fs");
const { join } = require("path");
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require('path');
const axios = require("axios");
const rimraf = require("rimraf");

const error = msg => {
  console.error(msg);
  process.exit(1);
};

class Binary {
  constructor(name, url, tag) {
    let errors = [];
    if (typeof url !== "string") {
      errors.push("url must be a string");
    } else {
      try {
        new URL(url);
      } catch (e) {
        errors.push(e);
      }
    }
    if (name && typeof name !== "string") {
      errors.push("name must be a string");
    }
    if (tag && typeof tag !== "string") {
      errors.push("tag must be a string");
    }

    if (!name) {
      errors.push("You must specify the name of your binary");
    }
    if (errors.length > 0) {
      let errorMsg =
        "One or more of the parameters you passed to the Binary constructor are invalid:\n";
      errors.forEach(error => {
        errorMsg += error;
      });
      errorMsg +=
        '\n\nCorrect usage: new Binary("my-binary", "https://example.com/binary/download")';
      error(errorMsg);
    }
    this.url = url;
    this.name = name;
    if (tag) {
      this.installDirectory = join(__dirname, "bin", tag);
    } else{
      this.installDirectory = join(__dirname, "bin");
    }

    if (!existsSync(this.installDirectory)) {
      mkdirSync(this.installDirectory, { recursive: true });
    }

    this.binaryPath = join(this.installDirectory, this.name);
  }

  install() {
    if (existsSync(this.binaryPath)) {
      console.log(`Skipping download/install step because binary already exists at ${this.installDirectory}`)
      return;
    }

    // if (existsSync(this.installDirectory)) { // DONT REMOVE BECAUSE FORCE FLAG IS PROBABLY GETTING ADDED AS WELL
    //   rimraf.sync(this.installDirectory);
    // }

    mkdirSync(this.installDirectory, { recursive: true });

    console.log(`Downloading release from ${this.url}`);

    return axios({ url: this.url, responseType: "stream" })
      .then(res => {
        const bPath = path.resolve(this.binaryPath);
        const writer = fs.createWriteStream(bPath);

        return new Promise((resolve, reject) => {
          res.data.pipe(writer);
          let error = null;

          writer.on('error', err => {
            error = err;
            writer.close();
            reject(err);
          });

          writer.on('close', () => {
            if (!error) {
              resolve(true);
            }
          });
        });
      })
      .then(() => {
        console.log(`${this.name} has been installed!`);
      })
      .catch(e => {
        error(`Error fetching release: ${e.message}`);
      });
  }

  run(...args) {
    if (!existsSync(this.binaryPath)) {
      error(`${this.binaryPath} not found.`);
    }

    fs.chmodSync(this.binaryPath, 755);

    const options = { cwd: process.cwd(), stdio: "inherit" };
    const result = spawnSync(this.binaryPath, args, options);

    if (result.error) {
      error(result.error);
    }

    process.exit(result.status);
  }
}

module.exports.Binary = Binary;
