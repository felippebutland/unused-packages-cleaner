import fs from 'fs';
import { promisify } from 'util';
import { exec as execCb } from 'child_process';
import { findUp } from 'find-up';
import { pathToFileURL } from 'url';

const exec = promisify(execCb);

export default async function removeUnusedDependencies() {
    const packageJsonPath = await findUp('package.json', { cwd: process.cwd() });
    const packageJsonUrl = pathToFileURL(packageJsonPath).toString();
    const packageJsonModule = await import(packageJsonUrl, { assert: { type: 'json' } });
    const packageJson = packageJsonModule.default;

    const findAllFiles = (dir) => {
        let results = [];
        const list = fs.readdirSync(dir);
        list.forEach((file) => {
            file = dir + `/` + file;
            const stat = fs.statSync(file);
            if (stat && stat.isDirectory()) {
                results = results.concat(findAllFiles(file));
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

    const filterDependencies = (deps) => {
        const newDeps = {};
        Object.keys(deps).forEach((dep) => {
            if (usedPackages.has(dep)) {
                newDeps[dep] = deps[dep];
            }
        });
        return newDeps;
    };

    packageJson.dependencies = filterDependencies(packageJson.dependencies);
    packageJson.devDependencies = filterDependencies(packageJson.devDependencies);

    fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));

    const emptyDependencies = Object.keys(packageJson.dependencies).filter((dep) => !packageJson.dependencies[dep]);
    if (emptyDependencies.length > 0) {
        const command = `npm uninstall ${emptyDependencies.join(' ')}`;
        console.log('\x1b[31m', `Removing empty dependencies...`);
        const { stdout, stderr } = await exec(command);
        console.log(stdout);
        console.error(stderr);
    }
    
    const empytDevDependencies = Object.keys(packageJson.devDependencies).filter((dep) => !packageJson.devDependencies[dep]);
    if (empytDevDependencies.length > 0) {
        const command = `npm uninstall ${empytDevDependencies.join(' ')}`;
        console.log('\x1b[31m', `Removing empty dependencies...`);
        const { stdout, stderr } = await exec(command);
        console.log(stdout);
        console.error(stderr);
    }
    
    console.log('\x1b[32m', 'Done!');
}

