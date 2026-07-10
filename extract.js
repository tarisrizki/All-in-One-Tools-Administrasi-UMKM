const fs = require('fs');
const lines = fs.readFileSync('C:\\Users\\Dragon\\.gemini\\antigravity-ide\\brain\\9fcd21a5-07b4-4a83-bbd0-957f894d2567\\.system_generated\\logs\\transcript_full.jsonl', 'utf8').split('\n');
let lastMsg = null;
for (const line of lines) {
    if (line.includes('"type":"USER_INPUT"')) {
        lastMsg = line;
    }
}
if (lastMsg) {
    const json = JSON.parse(lastMsg);
    const content = json.content;
    const patch = content.substring(content.indexOf('diff --git'));
    fs.writeFileSync('beres-design-fixes.patch', patch);
    console.log('Success');
} else {
    console.log('Not found');
}
