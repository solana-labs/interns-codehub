#!/bin/bash

GIT_ROOT=$(git rev-parse --show-cdup)
DIR_PRG_TGT="${GIT_ROOT}target"
DIR_SCRIPTS="${GIT_ROOT}scripts/src"
DIR_UI="${GIT_ROOT}ui/src"

rm -rf "${DIR_SCRIPTS}/*"
mkdir -p "${DIR_SCRIPTS}/target/types"
mkdir -p "${DIR_SCRIPTS}/target/idl"
cp -rf "${DIR_PRG_TGT}/idl" "${DIR_SCRIPTS}/target"
cp -rf "${DIR_PRG_TGT}/types" "${DIR_SCRIPTS}/target"

rm -rf "${DIR_UI}/*"
mkdir -p "${DIR_UI}/target/types"
mkdir -p "${DIR_UI}/target/idl"
cp -rf "${DIR_PRG_TGT}/idl" "${DIR_UI}/target"
cp -rf "${DIR_PRG_TGT}/types" "${DIR_UI}/target"

