import fs from 'fs';
import { promisify } from 'util';
import { exec as execCb } from 'child_process';
import { findUp } from 'find-up';
import { pathToFileURL } from 'url';

const exec = promisify(execCb);

export default async function removeUnusedDependencies({ action }) {
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
        const unusedDeps = {}

        if(!deps) return {}

        Object.keys(deps).forEach((dep) => {
            if (usedPackages.has(dep)) {
                newDeps[dep] = deps[dep];
            } else {
                unusedDeps[dep] = deps[dep]
            }
        });
        return {
            newDeps,
            unusedDeps
        };
    };

    packageJson.dependencies = filterDependencies(packageJson.dependencies);
    packageJson.devDependencies = filterDependencies(packageJson.devDependencies);

    if (action === 'remove') {
        await removeDependencies(formatDependencyList(packageJson.dependencies.unusedDeps), 'Uninstalling unused dependencies...');
        await removeDependencies(formatDependencyList(packageJson.devDependencies.unusedDeps), 'Uninstalling unused devDependencies...');
    } else if (action === 'analyze') {
        console.log('\x1b[32m', 'Unused dependencies:', packageJson.dependencies.unusedDeps);
        console.log('\x1b[32m', 'Unused devDependencies:', packageJson.devDependencies.unusedDeps);
    } else {
        console.log('\x1b[32m', 'Nothing to remove!');
    }
}

async function removeDependencies(dependencies, message) {
    if (dependencies) {
        const command = `npm uninstall ${dependencies}`;
        console.log('\x1b[31m', message);
        const { stdout, stderr } = await exec(command);
        console.log('\x1b[32m', 'Done!');
    }
}

function formatDependencyList(dependencies) {
    if(!dependencies) return;
    return Object.keys(dependencies).join(', ');
}
