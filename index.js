const fs = require('fs');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

const packageJson = require('./package.json');

const findAllFiles = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(findAllJsFiles(file));
        } else if (file.endsWith('.js')) {
            results.push(file);
        } else if (file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
};
const files = findAllFiles('./');

const usedPackages = new Set();
files.forEach((file) => {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const importRegexp = /^import\s.*?\bfrom\s['"]([^'"]+)['"]/gm;
        const requireRegexp = /^const\s.*?\s=\srequire\(['"]([^'"]+)['"]\)/gm;
        let match;
        while ((match = importRegexp.exec(content))) {
            usedPackages.add(match[1]);
        }
        while ((match = requireRegexp.exec(content))) {
            usedPackages.add(match[1]);
        }
    } catch (e) {
        console.log("file can't be found")
    }
});

const newDependencies = {};
Object.keys(packageJson.dependencies).forEach((dep) => {
    if (usedPackages.has(dep)) {
        newDependencies[dep] = packageJson.dependencies[dep];
    }
});

packageJson.dependencies = newDependencies;
fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));

const removeEmptyDependencies = async () => {
    const emptyDependencies = Object.keys(packageJson.dependencies).filter((dep) => !packageJson.dependencies[dep]);
    if (emptyDependencies.length > 0) {
        const command = `npm uninstall ${emptyDependencies.join(' ')}`;
        console.log('\x1b[31m', `Removing empty dependencies...`);
        const { stdout, stderr } = await exec(command);
        console.log(stdout);
        console.error(stderr);
    }
    console.log('\x1b[32m', 'Done!');
};
removeEmptyDependencies();

