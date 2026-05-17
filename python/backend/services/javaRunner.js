const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { v4: uuid } = require("uuid");

const runJava = (code) => {
  return new Promise((resolve, reject) => {
    const jobId = uuid();

    // create unique folder
    const dirPath = path.join(__dirname, "../temp", jobId);

    fs.mkdirSync(dirPath);

    // Main.java path
    const filePath = path.join(dirPath, "Main.java");

    fs.writeFileSync(filePath, code);

    const command = `docker run --rm -v "${process.cwd()}/temp:/app" amazoncorretto:21 bash -c "javac /app/${jobId}/Main.java && java -cp /app/${jobId} Main"`;

    exec(command, (error, stdout, stderr) => {
      // cleanup
      fs.rmSync(dirPath, { recursive: true, force: true });

      if (error) {
        reject(stderr || error.message);
        return;
      }

      resolve(stdout);
    });
  });
};

module.exports = runJava;
