const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, '..');

function replaceInDir(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === '.expo') continue;
        
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            replaceInDir(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('iconsax-reactjs')) {
                content = content.replace(/['"]iconsax-reactjs['"]/g, "'iconsax-react-native'");
                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

replaceInDir(directoryPath);
console.log('Done.');
