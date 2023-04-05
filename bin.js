#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import removeUnusedDependencies from './index.js';

yargs(hideBin(process.argv))
    .command(
        'remove',
        'Remove unused dependencies',
        () => {},
        () => removeUnusedDependencies({ action: 'remove' })
    )
    .command(
        'analyze',
        'Analyze unused dependencies',
        () => {},
        () => removeUnusedDependencies({ action: 'analyze' })
    )
    .demandCommand(1, 'You need to specify a command (remove or analyze)')
    .help().argv;
