const ts = require('typescript');
const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const findIssues = (sourceFile) => {
    const issues = [];

    const visit = (node) => {
        if (ts.isJsxText(node)) {
            const text = node.getText();
            // If it's just whitespace/newlines, ignore
            if (text.trim().length > 0) {
                const parent = node.parent;
                if (ts.isJsxElement(parent)) {
                    const tagName = parent.openingElement.tagName.getText();
                    if (tagName !== 'Text' && tagName !== 'Animated.Text') {
                        issues.push(`Unwrapped JSXText: "${text.trim()}" inside <${tagName}> at line ${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
                    }
                }
            }
        }
        
        if (ts.isJsxExpression(node)) {
            const parent = node.parent;
            if (parent && ts.isJsxElement(parent)) {
                const tagName = parent.openingElement.tagName.getText();
                if (tagName !== 'Text' && tagName !== 'Animated.Text') {
                    // Check if expression is something that could evaluate to string/number
                    // Such as logical AND `foo && "bar"` or identifier `variable`
                    // We just flag it for review
                    const expr = node.expression;
                    if (expr && (ts.isStringLiteral(expr) || ts.isNumericLiteral(expr) || ts.isBinaryExpression(expr) && expr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken)) {
                       issues.push(`Suspicious JSXExpression (might return text/number): "${expr.getText()}" inside <${tagName}> at line ${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1}`);
                    }
                }
            }
        }

        ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return issues;
};

const dirs = ['./app', './components'];
dirs.forEach(dir => {
    walkDir(dir, (filePath) => {
        if (filePath.endsWith('.tsx')) {
            const content = fs.readFileSync(filePath, 'utf8');
            const sourceFile = ts.createSourceFile(
                filePath,
                content,
                ts.ScriptTarget.Latest,
                true,
                ts.ScriptKind.TSX
            );
            const issues = findIssues(sourceFile);
            if (issues.length > 0) {
                console.log(`\nIssues in ${filePath}:`);
                issues.forEach(issue => console.log('  - ' + issue));
            }
        }
    });
});
