const { existsSync, mkdirSync } = require("fs");
const { join } = require("path");
const { spawnSync } = require("child_process");
let fs = require("fs");
const path = require('path');

const axios = require("axios");
const rimraf = require("rimraf");

const error = msg => {
  console.error(msg);
  process.exit(1);
};

class Binary {
  constructor(name, url) {
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
    this.installDirectory = join(__dirname, "bin");

    if (!existsSync(this.installDirectory)) {
      mkdirSync(this.installDirectory, { recursive: true });
    }

    this.binaryPath = join(this.installDirectory, this.name);
  }

  install() {
    if (existsSync(this.installDirectory)) {
      rimraf.sync(this.installDirectory);
    }

    mkdirSync(this.installDirectory, { recursive: true });

    console.log(`Downloading release from ${this.url}`);

    return axios({ url: this.url, responseType: "stream" })
      .then(res => {
        const bPath = path.resolve(this.binaryPath);
        const writer = fs.createWriteStream(bPath);
        res.data.pipe(writer);
      })
      .then(() => {
        console.log(`${this.name} has been installed!`);
      })
      .catch(e => {
        error(`Error fetching release: ${e.message}`);
      });
  }

  run(...args) {
    const TIMEOUT_SECONDS = 15;
    console.log("Waiting for file writing to finish");
    let waitForFile = function(i) {
      return function() {
        if (i >= TIMEOUT_SECONDS * 5) {
          return;
        } else {
          setTimeout(waitForFile(++i), 200);
        }
      }
    }

    if (!existsSync(this.binaryPath)) {
      error(`${this.binaryPath} not found, waiting terminated after ${TIMEOUT_SECONDS} seconds.`);
    }

    fs.chmodSync(this.binaryPath, 755);

    console.log(process);

    const options = { cwd: process.cwd(), stdio: "inherit" };

    const result = spawnSync(this.binaryPath, args, options);

    if (result.error) {
      error(result.error);
    }

    process.exit(result.status);
  }
}

module.exports.Binary = Binary;
