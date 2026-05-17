const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { v4: uuid } = require("uuid");

const runCpp = (code) => {
  return new Promise((resolve, reject) => {
    const jobId = uuid();

    const fileName = `${jobId}.cpp`;

    const filePath = path.join(__dirname, "../temp", fileName);

    fs.writeFileSync(filePath, code);

    const command = `docker run --rm -v "${process.cwd()}/temp:/app" gcc bash -c "g++ /app/${fileName} -o /app/output && /app/output"`;

    exec(command, (error, stdout, stderr) => {
      fs.unlinkSync(filePath);

      if (error) {
        reject({
          error: stderr || error.message,
        });
        return;
      }

      resolve(stdout);
    });
  });
};

module.exports = runCpp;
