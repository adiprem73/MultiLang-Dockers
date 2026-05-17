const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { v4: uuid } = require("uuid");

const runPython = (code) => {
  return new Promise((resolve, reject) => {
    const jobId = uuid();
    const fileName = `${jobId}.py`;
    const filePath = path.join(__dirname, "../temp", fileName);

    fs.writeFileSync(filePath, code);

    const command = `docker run --rm -v "${process.cwd()}/temp:/app" python:3.11 python /app/${fileName}`;
    exec(command, (error, stdout, stderr) => {
        fs.unlinkSync(filePath);
      if (error) {
        reject(error.message);
        return;
      }

      if (stderr) {
        reject(stderr);
        return;
      }

      resolve(stdout);
    });
  });
};

module.exports = runPython;
