const simpleGit = require('simple-git')(`${__dirname}/..`);
let listFilesModified = [];

function excludeNonCommitedFiles(file) {
  return file.index !== 'D' // NOTICE: Deleted files
    && file.index !== ' ' // NOTICE: Files not staged for commit
    && file.index !== '?'; // NOTICE: Untracked files
}

function getFilesModified(callback) {
  simpleGit.status((error, status) => {
    if (error) {
      console.error(error);
      process.exit(-1);
    }

    listFilesModified = status.files
      .filter(excludeNonCommitedFiles)
      .map(file => {
        if (file.index === 'R') {
          return file.path.substring(file.path.indexOf(' -> ') + 4);
        }
        return file.path;
      })
      .filter(file => file.endsWith('.js'));

    callback();
  });
}

function runEslint(callback) {
  if (listFilesModified.length === 0) {
    return callback(0);
  }

  console.log(`[ESLint] Validating changed files:\n${listFilesModified.join('\n')}`);
  const eslintPath = `${__dirname}/../node_modules/.bin/eslint`;
  const spawn = require('child_process').spawn;
  const cmd = spawn(eslintPath, listFilesModified, { stdio: 'inherit', shell: true });

  cmd.on('exit',code => callback(code));
}

getFilesModified((error) => {
  if (error) {
    console.error(error);
    process.exit(-2);
  }

  runEslint((code) => process.exit(code));
});
