#!/usr/bin/env bash

kill $(ps aux | grep '[t]estrpc' | awk '{print $2}')
./node_modules/.bin/solidity-coverage
