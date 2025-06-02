const { spawn } = require('child_process');
const path = require('path');

async function runWikiProcess({ prompt }) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'python', 'wiki_process.py');
    const py = spawn('python3', [scriptPath]);

    let output = '';
    let error = '';

    py.stdout.on('data', (data) => {
      output += data.toString();
    });

    py.stderr.on('data', (data) => {
      error += data.toString();
    });

    py.on('close', (code) => {
      // Only reject on non-zero exit code
      if (code !== 0) {
        return reject(new Error(error || `Wikipedia Python script failed with code ${code}`));
      }

      try {
        const result = JSON.parse(output);
        if (result.error) {
          return reject(new Error(result.error));
        }
        // Log warning if GuessedAtParserWarning is present
        if (error.includes('GuessedAtParserWarning')) {
          console.warn('Ignoring GuessedAtParserWarning:', error);
        } else if (error) {
          console.warn('Non-critical stderr output:', error);
        }
        resolve(result);
      } catch (err) {
        reject(new Error('Invalid JSON from Wikipedia script: ' + output));
      }
    });

    py.stdin.write(JSON.stringify({ prompt }));
    py.stdin.end();
  });
}

module.exports = runWikiProcess;