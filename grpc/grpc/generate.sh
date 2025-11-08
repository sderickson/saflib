#!/usr/bin/env bash
set -e
protoc --ts_out=./dist/ \
  --proto_path=./ \
  --ts_opt=no_namespace \
  --ts_opt=unary_rpc_promise=true \
  protos/*.proto

# Hack to add .ts extension to dependency imports, because node requires them
for file in ./dist/**/*.ts; do
  sed 's/from "\.\([^"]*\)"/from "\.\1.ts"/' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
done

# Hack to skip typechecking for generated files
for file in ./dist/**/*.ts; do
  echo "// @ts-nocheck" > "$file.tmp" && cat "$file" >> "$file.tmp" && mv "$file.tmp" "$file"
done
