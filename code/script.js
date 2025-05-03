const textarea = document.getElementById('codeInput');
        const errorDiv = document.getElementById('errorMessages');
        const outputFrame = document.getElementById('outputFrame');
        const outputSection = document.getElementById('outputSection');
        const lineNumbers = document.getElementById('lineNumbers');
        const lineNumbersPre = lineNumbers.querySelector('pre');
        const saveFileContainer = document.getElementById('saveFileContainer');
        const saveFileInput = document.getElementById('saveFileInput');
        const MAX_LINES = 9999;

        function updateLineNumbers() {
            const lines = textarea.value.split('\n');
            const numberOfLines = Math.min(lines.length, MAX_LINES);
            const lineHeight = parseFloat(getComputedStyle(textarea).lineHeight) || 20;
            const visibleHeight = textarea.clientHeight - 24;
            const visibleLines = Math.ceil(visibleHeight / lineHeight);
            const scrollTop = textarea.scrollTop;
            const firstVisibleLine = Math.floor(scrollTop / lineHeight);

            const allNumbers = Array.from(
                { length: Math.max(numberOfLines, firstVisibleLine + visibleLines) },
                (_, i) => i + 1
            );

            let visibleNumbers = allNumbers.slice(firstVisibleLine, firstVisibleLine + visibleLines);
            while (visibleNumbers.length < visibleLines) {
                visibleNumbers.push('');
            }

            lineNumbersPre.innerHTML = visibleNumbers.join('\n');

            if (lines.length > MAX_LINES) {
                textarea.value = lines.slice(0, MAX_LINES).join('\n');
            }

            requestAnimationFrame(() => {
                lineNumbers.scrollTop = scrollTop;
            });
        }

        textarea.addEventListener('input', updateLineNumbers);
        textarea.addEventListener('scroll', updateLineNumbers);
        window.addEventListener('resize', updateLineNumbers);

        updateLineNumbers();

        function removeComments(code, language) {
            const lines = code.split('\n');
            const result = [];
            let inMultiLineComment = false;
            let inString = false;
            let stringChar = '';

            if (language === 'html') {
                for (let line of lines) {
                    line = line.replace(/<!--[\s\S]*?-->/g, '');
                    result.push(line);
                }
            } else if (['javascript', 'java', 'cpp'].includes(language)) {
                for (let line of lines) {
                    let newLine = '';
                    let i = 0;
                    while (i < line.length) {
                        if (inString) {
                            newLine += line[i];
                            if (line[i] === stringChar && line[i - 1] !== '\\') {
                                inString = false;
                            }
                            i++;
                        } else if (inMultiLineComment) {
                            if (i + 1 < line.length && line[i] === '*' && line[i + 1] === '/') {
                                inMultiLineComment = false;
                                i += 2;
                            } else {
                                i++;
                            }
                        } else {
                            if (line[i] === '"' || line[i] === "'") {
                                inString = true;
                                stringChar = line[i];
                                newLine += line[i];
                                i++;
                            } else if (i + 1 < line.length && line[i] === '/' && line[i + 1] === '*') {
                                inMultiLineComment = true;
                                i += 2;
                            } else if (i + 1 < line.length && line[i] === '/' && line[i + 1] === '/') {
                                break;
                            } else {
                                newLine += line[i];
                                i++;
                            }
                        }
                    }
                    result.push(newLine);
                }
            } else if (language === 'python') {
                for (let line of lines) {
                    let newLine = '';
                    let i = 0;
                    inString = false;
                    stringChar = '';
                    while (i < line.length) {
                        if (inString) {
                            newLine += line[i];
                            if (line[i] === stringChar && line[i - 1] !== '\\') {
                                inString = false;
                            }
                            i++;
                        } else if (line[i] === '#' && !inString) {
                            break;
                        } else if (line[i] === '"' || line[i] === "'") {
                            inString = true;
                            stringChar = line[i];
                            newLine += line[i];
                            i++;
                        } else {
                            newLine += line[i];
                            i++;
                        }
                    }
                    result.push(newLine);
                }
            } else if (language === 'css') {
                for (let line of lines) {
                    line = line.replace(/\/\*[\s\S]*?\*\//g, '');
                    result.push(line);
                }
            }
            return result.join('\n');
        }

        const languageValidators = {
            javascript: (code) => {
                const errors = [];
                const cleanCode = removeComments(code, 'javascript');
                const lines = cleanCode.split('\n');

                try {
                    new Function(cleanCode);
                } catch (e) {
                    const match = e.message.match(/line (\d+)/i);
                    const lineNum = match ? parseInt(match[1]) : null;
                    errors.push({
                        message: `A syntax error occurred: ${e.message}. Please check your code for correct syntax, such as proper punctuation or matching brackets.`,
                        line: lineNum
                    });
                }

                lines.forEach((line, i) => {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('function ') && !trimmed.includes('(')) {
                        errors.push({
                            message: `The function declaration is missing parentheses after the function name. Ensure the function is defined with '()' after the name (e.g., 'function sayHello()').`,
                            line: i + 1
                        });
                    }
                });

                const varRegex = /\b(let|const|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
                const declaredVars = new Set();
                let match;
                while ((match = varRegex.exec(cleanCode)) !== null) {
                    declaredVars.add(match[2]);
                }

                lines.forEach((line, i) => {
                    const trimmed = line.trim();
                    if (trimmed.match(/for\s*\(\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*=/)) {
                        const loopVarMatch = trimmed.match(/for\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/);
                        if (loopVarMatch && !declaredVars.has(loopVarMatch[1]) && !trimmed.match(/\b(let|const|var)\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*=/)) {
                            errors.push({
                                message: `The variable '${loopVarMatch[1]}' in the for loop is not declared. Use 'let', 'const', or 'var' to declare it (e.g., 'let ${loopVarMatch[1]}').`,
                                line: i + 1
                            });
                        }
                    }
                });

                return errors;
            },
            python: (code) => {
                const errors = [];
                const cleanCode = removeComments(code, 'python');
                const lines = cleanCode.split('\n');
                let indentStack = [0];

                lines.forEach((line, i) => {
                    if (!line.trim()) return;
                    const indent = line.match(/^\s*/)[0].length;
                    const trimmed = line.trim();

                    if (indent % 4 !== 0 && indent > 0) {
                        errors.push({
                            message: `The indentation is incorrect. Python expects indentation to use exactly 4 spaces for each level.`,
                            line: i + 1
                        });
                        return;
                    }

                    if (trimmed.match(/^(if|elif|else|for|while|def|class|try|except|with)/)) {
                        if (!trimmed.endsWith(':')) {
                            errors.push({
                                message: `The statement '${trimmed.split(' ')[0]}' requires a colon (:) at the end to indicate the start of a block.`,
                                line: i + 1
                            });
                        } else if (i + 1 < lines.length) {
                            const nextIndent = lines[i + 1].match(/^\s*/)[0].length;
                            if (nextIndent <= indent && lines[i + 1].trim()) {
                                errors.push({
                                    message: `An indented block is expected after '${trimmed.split(' ')[0]}' to define the scope of the statement.`,
                                    line: i + 2
                                });
                            } else if (nextIndent > indent) {
                                indentStack.push(nextIndent);
                            }
                        }
                    }

                    if (indent < indentStack[indentStack.length - 1]) {
                        while (indentStack.length > 1 && indent < indentStack[indentStack.length - 1]) {
                            indentStack.pop();
                        }
                        if (indent !== indentStack[indentStack.length - 1]) {
                            errors.push({
                                message: `The indentation level does not align with any previous indentation level. Ensure consistent use of 4 spaces.`,
                                line: i + 1
                            });
                        }
                    }
                });

                return errors;
            },
            html: (code) => {
                const errors = [];
                const cleanCode = removeComments(code, 'html');
                const lines = cleanCode.split('\n');

                if (!cleanCode.match(/^<!DOCTYPE\s+html>/i)) {
                    errors.push({
                        message: `The HTML document is missing a DOCTYPE declaration, which should be the first line (e.g., <!DOCTYPE html>) to define the document type.`,
                        line: 1
                    });
                }

                const stack = [];
                const voidElements = ['br', 'img', 'hr', 'input', 'meta', 'link'];
                let inScript = false;
                let inStyle = false;
                let lineNum = 0;

                const tagRegex = /<[^>]+>/g;
                let match;
                let currentLine = 0;

                while ((match = tagRegex.exec(cleanCode)) !== null) {
                    while (match.index >= (lines.slice(0, currentLine + 1).join('\n').length + currentLine + 1)) {
                        currentLine++;
                    }
                    lineNum = currentLine + 1;

                    const tag = match[0];
                    const isClosing = tag.startsWith('</');
                    const tagNameMatch = tag.match(/<\/?([a-z][a-z0-9]*)/i);

                    if (!tagNameMatch) continue;

                    const tagName = tagNameMatch[1].toLowerCase();

                    if (tagName === 'script') {
                        if (!isClosing) {
                            inScript = true;
                        } else {
                            inScript = false;
                        }
                        continue;
                    }
                    if (tagName === 'style') {
                        if (!isClosing) {
                            inStyle = true;
                        } else {
                            inStyle = false;
                        }
                        continue;
                    }
                    if (inScript || inStyle) continue;

                    if (!isClosing) {
                        if (!voidElements.includes(tagName) && !tag.endsWith('/>')) {
                            stack.push({ name: tagName, line: lineNum });
                        }
                    } else if (stack.length) {
                        const lastTag = stack[stack.length - 1];
                        if (lastTag.name === tagName) {
                            stack.pop();
                        } else {
                            errors.push({
                                message: `A mismatched closing tag was found: expected </${lastTag.name}> to close the open tag, but found </${tagName}>.`,
                                line: lineNum
                            });
                        }
                    } else {
                        errors.push({
                            message: `An unexpected closing tag </${tagName}> was found with no matching opening tag.`,
                            line: lineNum
                        });
                    }
                }

                stack.forEach(tag => {
                    if (['html', 'body', 'head'].includes(tag.name)) {
                        errors.push({
                            message: `The tag <${tag.name}> is not closed. Please add a corresponding </${tag.name}> to properly close it.`,
                            line: tag.line
                        });
                    }
                });

                return errors;
            },
            css: (code) => {
                const errors = [];
                const cleanCode = removeComments(code, 'css');
                const lines = cleanCode.split('\n');
                let braceCount = 0;

                lines.forEach((line, i) => {
                    if (!line.trim()) return;
                    const trimmed = line.trim();

                    if (trimmed.includes('{')) {
                        braceCount++;
                    } else if (trimmed.includes('}')) {
                        braceCount--;
                        if (braceCount < 0) {
                            errors.push({
                                message: `An extra closing brace was found, which does not match any opening brace.`,
                                line: i + 1
                            });
                        }
                    }
                });

                if (braceCount > 0) {
                    errors.push({
                        message: `There are ${braceCount} unclosed opening brace(s) in the CSS code. Please add the missing closing brace(s).`,
                        line: lines.length
                    });
                }

                return errors;
            },
            java: (code) => {
                const errors = [];
                const cleanCode = removeComments(code, 'java');
                const lines = cleanCode.split('\n');

                if (!cleanCode.match(/public\s+class\s+\w+/)) {
                    errors.push({
                        message: `The Java code is missing a public class declaration, which is required to define the main class (e.g., public class Main).`,
                        line: 1
                    });
                }

                let braceCount = 0;
                lines.forEach((line, i) => {
                    if (!line.trim()) return;
                    braceCount += (line.match(/{/g) || []).length;
                    braceCount -= (line.match(/}/g) || []).length;
                });

                if (braceCount !== 0) {
                    errors.push({
                        message: `The code has unmatched braces: ${braceCount > 0 ? 'missing ' + braceCount + ' closing brace(s)' : 'extra ' + -braceCount + ' opening brace(s)'}. Please ensure all braces are properly paired.`,
                        line: lines.length
                    });
                }

                return errors;
            },
            cpp: (code) => {
                const errors = [];
                const cleanCode = removeComments(code, 'cpp');
                const lines = cleanCode.split('\n');

                if (!cleanCode.includes('int main') && !cleanCode.includes('void main')) {
                    errors.push({
                        message: `The C++ code is missing a main function, which is required as the entry point of the program (e.g., int main() or void main()).`,
                        line: 1
                    });
                }

                let braceCount = 0;
                lines.forEach((line, i) => {
                    if (!line.trim()) return;
                    braceCount += (line.match(/{/g) || []).length;
                    braceCount -= (line.match(/}/g) || []).length;
                });

                if (braceCount !== 0) {
                    errors.push({
                        message: `The code has unmatched braces: ${braceCount > 0 ? 'missing ' + braceCount + ' closing brace(s)' : 'extra ' + -braceCount + ' opening brace(s)'}. Please ensure all braces are properly paired.`,
                        line: lines.length
                    });
                }

                return errors;
            }
        };

        function detectLanguage(code) {
            code = code.trim().toLowerCase();
            if (code.startsWith('<!doctype') || code.includes('<html') || code.includes('</')) {
                return 'html';
            }
            if (code.includes('{') && code.includes('}') && code.includes(':') && code.includes(';') && !code.includes('function')) {
                return 'css';
            }
            if (code.includes('def ') || code.includes('print(') || code.includes('import ') || code.match(/^[ \t]*if.*:/)) {
                return 'python';
            }
            if (code.includes('public class') && code.includes('public static void main')) {
                return 'java';
            }
            if (code.includes('#include') || code.includes('int main') || code.includes('void main')) {
                return 'cpp';
            }
            if (code.includes('function') || code.includes('let ') || code.includes('const ') || code.includes('=>')) {
                return 'javascript';
            }
            return 'html';
        }

        function validateCode() {
            errorDiv.innerHTML = '';
            errorDiv.style.color = 'red';
            const code = textarea.value.trim();

            if (!code) {
                errorDiv.innerHTML = 'No code entered';
                outputSection.style.display = 'none';
                return;
            }

            const language = detectLanguage(code);
            const errors = languageValidators[language](code);

            if (errors.length > 0) {
                errorDiv.innerHTML = errors
                    .map(error => {
                        return error.line ? `Line ${error.line}: ${error.message}` : error.message;
                    })
                    .join('<br>');
                errorDiv.style.color = 'red';
            } else {
                errorDiv.innerHTML = 'No Errors Detected';
                errorDiv.style.color = 'red';
                setTimeout(() => {
                    errorDiv.innerHTML = '';
                    errorDiv.style.color = 'red';
                }, 2000);
            }
        }

        function executeCode() {
            const code = textarea.value.trim();

            try {
                if (!code) {
                    errorDiv.innerHTML = 'No code entered';
                    errorDiv.style.color = 'red';
                    outputFrame.srcdoc = '';
                    outputSection.style.display = 'none';
                    return;
                }

                const language = detectLanguage(code);

                if (language === 'html') {
                    outputFrame.srcdoc = code;
                    outputSection.style.display = 'block';
                } else {
                    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(code);
                    if (hasHtmlTags) {
                        outputFrame.srcdoc = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Output</title></head><body>${code}</body></html>`;
                        outputSection.style.display = 'block';
                    } else {
                        outputFrame.srcdoc = '';
                        outputSection.style.display = 'none';
                        errorDiv.innerHTML = 'No visible output for this code. Only HTML content is displayed in the output section.';
                        errorDiv.style.color = 'red';
                        return;
                    }
                }

                errorDiv.innerHTML = 'No Errors Detected';
                errorDiv.style.color = 'red';
                setTimeout(() => {
                    errorDiv.innerHTML = '';
                    errorDiv.style.color = 'red';
                }, 3000);

            } catch (e) {
                errorDiv.innerHTML = 'Execution error';
                errorDiv.style.color = 'red';
                outputFrame.srcdoc = '';
                outputSection.style.display = 'none';
            }
        }

        function showSaveFileInput() {
            console.log('showSaveFileInput called');
            try {
                const code = textarea.value.trim();
                if (!code) {
                    errorDiv.innerHTML = 'Please enter some code to save';
                    errorDiv.style.color = 'red';
                    outputSection.style.display = 'none';
                    setTimeout(() => {
                        errorDiv.innerHTML = '';
                        errorDiv.style.color = 'red';
                    }, 5000);
                    return;
                }
                saveFileContainer.style.display = 'flex';
                console.log('saveFileContainer display set to flex');
                saveFileInput.focus();
                errorDiv.innerHTML = '';
            } catch (e) {
                console.error('Error in showSaveFileInput:', e);
                errorDiv.innerHTML = 'Error displaying save input';
                errorDiv.style.color = 'red';
            }
        }

        function saveCode() {
            console.log('saveCode called');
            const code = textarea.value.trim();
            const fileName = saveFileInput.value.trim();

            try {
                if (!code) {
                    errorDiv.innerHTML = 'No code entered';
                    errorDiv.style.color = 'red';
                    return;
                }

                if (!fileName) {
                    errorDiv.innerHTML = 'Please enter a file name';
                    errorDiv.style.color = 'red';
                    return;
                }

                const extension = fileName.split('.').pop().toLowerCase();
                let mimeType = 'text/plain';
                switch (extension) {
                    case 'html':
                    case 'htm':
                        mimeType = 'text/html';
                        break;
                    case 'js':
                        mimeType = 'application/javascript';
                        break;
                    case 'py':
                        mimeType = 'text/x-python';
                        break;
                    case 'css':
                        mimeType = 'text/css';
                        break;
                    case 'java':
                        mimeType = 'text/x-java';
                        break;
                    case 'cpp':
                    case 'c':
                    case 'h':
                        mimeType = 'text/x-c++src';
                        break;
                }

                let content = code;
                if (['html', 'htm'].includes(extension) && (code.includes('<html') || code.includes('<!DOCTYPE'))) {
                    content = code;
                } else if (['html', 'htm'].includes(extension)) {
                    content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Saved Code - CODEXEDOC</title>
</head>
<body>
${code}
</body>
</html>`;
                }

                const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
                const link = document.createElement('a');

                if ('download' in link) {
                    link.href = URL.createObjectURL(blob);
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } else {
                    console.log('Download attribute not supported, using fallback');
                    const url = URL.createObjectURL(blob);
                    window.location.href = url;
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                }

                errorDiv.innerHTML = 'File saved successfully';
                errorDiv.style.color = 'red';
                saveFileContainer.style.display = 'none';
                saveFileInput.value = '';

                setTimeout(() => {
                    errorDiv.innerHTML = '';
                    errorDiv.style.color = 'red';
                }, 3000);

            } catch (e) {
                console.error('Error in saveCode:', e);
                errorDiv.innerHTML = 'Error saving file';
                errorDiv.style.color = 'red';
            }
        }

        saveFileInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveCode();
            }
        });
