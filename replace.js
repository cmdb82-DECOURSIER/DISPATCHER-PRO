const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./src');

const replacements = [
    { from: /px-16 py-6 rounded-\[32px\]/g, to: 'px-10 py-4 rounded-2xl min-h-[48px]' },
    { from: /px-10 py-5 rounded-\[28px\]/g, to: 'px-6 py-3.5 rounded-xl min-h-[44px]' },
    { from: /px-7 py-3 rounded-2xl/g, to: 'px-6 py-3 rounded-xl min-h-[44px]' },
    { from: /px-6 py-3 rounded-2xl/g, to: 'px-5 py-3 rounded-xl min-h-[44px]' },
    { from: /px-5 py-3 rounded-2xl/g, to: 'px-5 py-2.5 rounded-xl min-h-[44px]' },
    { from: /px-6 py-4\.5/g, to: 'px-5 py-3.5' },
    { from: /px-8 py-4 text-left/g, to: 'px-6 py-3.5 text-left' },
    { from: /p-1\.5 text-slate/g, to: 'p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-slate' },
    { from: /p-1\.5 bg-/g, to: 'p-2 min-w-[36px] min-h-[36px] flex items-center justify-center bg-' },
    { from: /px-3 py-2 rounded-xl text-\[10px\]/g, to: 'px-4 py-2.5 rounded-xl text-[11px] min-h-[40px]' },
    { from: /px-3 py-1 rounded-md text-\[8px\]/g, to: 'px-3 max-h-[32px] py-1.5 rounded-lg text-[10px]' }
];

let filesModified = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content;
    
    replacements.forEach(r => {
        newContent = newContent.replace(r.from, r.to);
    });
    
    if (content !== newContent) {
        fs.writeFileSync(file, newContent, 'utf8');
        filesModified++;
        console.log(`Modified ${file}`);
    }
});

console.log(`Done. Modified ${filesModified} files.`);
