const { spawn } = require('child_process');
const path = require('path');

async function runPythonChat({ msg, user = 'user', name = '', model = 'meta-llama/llama-4-scout-17b-16e-instruct' }) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, 'python', 'chatbot.py');
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
      if (code !== 0) {
        return reject(new Error(error || `Python script failed with code ${code}`));
      }

      try {
        const result = JSON.parse(output);
        if (result.error) {
          return reject(new Error(result.error));
        }
        if (!result.reply) {
          return reject(new Error('No reply in Python script output'));
        }
        if (error) {
          console.warn('Non-critical stderr output:', error);
        }
        resolve({ reply: result.reply });
      } catch (err) {
        reject(new Error('Invalid JSON from Python: ' + output));
      }
    });

    py.stdin.write(JSON.stringify({ msg, user, name, model }));
    py.stdin.end();
  });
}

module.exports = runPythonChat;